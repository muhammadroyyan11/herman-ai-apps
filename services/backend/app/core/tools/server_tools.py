import asyncssh
import os
import shlex
import re
from typing import Optional, Any
from app.core.tools.registry import Tool, tool_registry
from app.config.settings import get_settings


async def _get_ssh_connection():
    settings = get_settings()
    kwargs = dict(
        host=settings.SERVER_HOST,
        port=settings.SERVER_PORT,
        username=settings.SERVER_USER,
        known_hosts=None,
    )
    if settings.SERVER_PASSWORD:
        kwargs["password"] = settings.SERVER_PASSWORD
        kwargs["client_keys"] = None
    else:
        key_path = os.path.expanduser("/root/.ssh/id_rsa")
        if os.path.exists(key_path):
            kwargs["client_keys"] = [key_path]
    return await asyncssh.connect(**kwargs)


def _resolve_path(path: str, target: str = "dev") -> str:
    settings = get_settings()
    base = settings.SERVER_DEV_PATH if target == "dev" else settings.SERVER_PROD_PATH
    if path.startswith("/"):
        return path
    return f"{base}/{path}"


async def server_shell(command: str, workdir: Optional[str] = None, target: str = "dev") -> str:
    settings = get_settings()
    base = settings.SERVER_DEV_PATH if target == "dev" else settings.SERVER_PROD_PATH
    conn = await _get_ssh_connection()
    try:
        wd = workdir if workdir else base
        full_cmd = f"cd {wd} && {command}"
        result = await conn.run(full_cmd, timeout=60)
        output = ""
        if result.stdout:
            output += result.stdout
        if result.stderr:
            output += f"\n[stderr]\n{result.stderr}"
        if result.returncode != 0:
            output += f"\n[exit code: {result.returncode}]"
        return output.strip() or "(no output)"
    finally:
        conn.close()


async def file_editor(
    path: str,
    action: str,
    content: Optional[str] = None,
    old_string: Optional[str] = None,
    new_string: Optional[str] = None,
    target: str = "dev",
) -> str:
    full_path = _resolve_path(path, target)

    conn = await _get_ssh_connection()
    try:
        if action == "read":
            result = await conn.run(f"cat {full_path}", timeout=30)
            if result.returncode != 0:
                return f"Error reading file: {result.stderr}"
            return result.stdout
        elif action == "write":
            result = await conn.run(
                f"mkdir -p $(dirname {full_path}) && cat > {full_path} << 'HERMANEOF'\n{content}\nHERMANEOF",
                timeout=30,
            )
            if result.returncode != 0:
                return f"Error writing file: {result.stderr}"
            return f"File written: {full_path} ({len(content)} bytes)"
        elif action == "edit":
            if not old_string:
                return "Error: old_string required for 'edit' action"
            import base64, json
            payload = base64.b64encode(json.dumps({
                "path": full_path,
                "old": old_string,
                "new": new_string or "",
            }).encode()).decode()
            result = await conn.run(
                f"python3 -c \"import base64,json,sys; p=json.loads(base64.b64decode('{payload}')); d=open(p['path']).read(); "
                f"d=d.replace(p['old'],p['new'],1); open(p['path'],'w').write(d); print('Edited OK')\"",
                timeout=30,
            )
            if result.returncode != 0:
                return f"Error: {(result.stderr or result.stdout or 'edit failed')[:200]}"
            return "Edited successfully"
        elif action == "list":
            result = await conn.run(f"ls -la {full_path}", timeout=30)
            return result.stdout or result.stderr or "(empty directory)"
        elif action == "delete":
            result = await conn.run(f"rm -rf {full_path}", timeout=30)
            if result.returncode != 0:
                return f"Error deleting: {result.stderr}"
            return f"Deleted: {full_path}"
        else:
            return f"Unknown action: {action}. Supported: read, write, edit, list, delete"
    finally:
        conn.close()


async def git_ops(action: str, message: Optional[str] = None, branch: Optional[str] = None, target: str = "dev") -> str:
    settings = get_settings()
    base = settings.SERVER_DEV_PATH if target == "dev" else settings.SERVER_PROD_PATH

    conn = await _get_ssh_connection()
    try:
        if action == "status":
            result = await conn.run(f"cd {base} && git status", timeout=30)
            return result.stdout or result.stderr
        elif action == "diff":
            result = await conn.run(f"cd {base} && git diff", timeout=30)
            return result.stdout or "(no changes)"
        elif action == "add":
            result = await conn.run(f"cd {base} && git add -A", timeout=30)
            if result.returncode != 0:
                return f"Error: {result.stderr}"
            result2 = await conn.run(f"cd {base} && git diff --cached --stat", timeout=30)
            return result2.stdout or "(nothing staged)"
        elif action == "commit":
            if not message:
                return "Error: message required for commit"
            escaped_msg = message.replace("'", "'\\''")
            result = await conn.run(f"cd {base} && git commit -m '{escaped_msg}'", timeout=30)
            return result.stdout or result.stderr
        elif action == "push":
            result = await conn.run(f"cd {base} && git push", timeout=60)
            return result.stdout or result.stderr
        elif action == "pull":
            result = await conn.run(f"cd {base} && git pull", timeout=60)
            return result.stdout or result.stderr
        elif action == "log":
            count = message or "10"
            result = await conn.run(f"cd {base} && git log --oneline -{count}", timeout=30)
            return result.stdout or "(no commits)"
        else:
            return f"Unknown action: {action}. Supported: status, diff, add, commit, push, pull, log"
    finally:
        conn.close()


async def _run_mysql(sql: str) -> str:
    settings = get_settings()
    conn = await _get_ssh_connection()
    try:
        cmd = (
            f"echo {shlex.quote(sql)} | mysql -h {settings.DB_HELPDESK_HOST} "
            f"-P {settings.DB_HELPDESK_PORT} -u {settings.DB_HELPDESK_USER} "
            f"-p{shlex.quote(settings.DB_HELPDESK_PASS)} {settings.DB_HELPDESK_NAME} --table 2>&1"
        )
        result = await conn.run(cmd, timeout=30)
        output = (result.stdout or "") + (result.stderr or "")
        return output.strip() or "(no output)"
    finally:
        conn.close()


async def db_query(sql: str) -> str:
    return await _run_mysql(sql)


async def db_schema(table: Optional[str] = None) -> str:
    if table:
        return await _run_mysql(f"DESCRIBE `{table}`")
    else:
        return await _run_mysql("SHOW TABLES")


def register_server_tools():
    tools = [
        Tool(
            name="server_shell",
            description="Execute any bash command on the remote server via SSH. Use this to run commands, scripts, install packages, restart services, etc.",
            handler=server_shell,
            input_schema={
                "type": "object",
                "properties": {
                    "command": {
                        "type": "string",
                        "description": "The bash command to execute on the server",
                    },
                    "workdir": {
                        "type": "string",
                        "description": "Working directory on the server (default: project root)",
                    },
                    "target": {
                        "type": "string",
                        "enum": ["dev", "prod"],
                        "description": "Target environment: 'dev' for editing code, 'prod' for viewing tasks (default: dev)",
                    },
                },
                "required": ["command"],
            },
        ),
        Tool(
            name="file_editor",
            description="Read, write, edit, list, or delete files on the remote server. Use this to view source code, create new files, make targeted edits, or explore directory structure.",
            handler=file_editor,
            input_schema={
                "type": "object",
                "properties": {
                    "path": {
                        "type": "string",
                        "description": "File or directory path (absolute, or relative to project root)",
                    },
                    "action": {
                        "type": "string",
                        "enum": ["read", "write", "edit", "list", "delete"],
                        "description": "Action to perform: read (cat), write (create/overwrite), edit (find & replace), list (ls -la), delete (rm -rf)",
                    },
                    "content": {
                        "type": "string",
                        "description": "Full file content for 'write' action",
                    },
                    "old_string": {
                        "type": "string",
                        "description": "Text to replace for 'edit' action",
                    },
                    "new_string": {
                        "type": "string",
                        "description": "Replacement text for 'edit' action",
                    },
                    "target": {
                        "type": "string",
                        "enum": ["dev", "prod"],
                        "description": "Target environment: 'dev' for editing code, 'prod' for viewing tasks (default: dev)",
                    },
                },
                "required": ["path", "action"],
            },
        ),
        Tool(
            name="git_ops",
            description="Perform git operations on the remote server project: status, diff, add, commit, push, pull, log",
            handler=git_ops,
            input_schema={
                "type": "object",
                "properties": {
                    "action": {
                        "type": "string",
                        "enum": ["status", "diff", "add", "commit", "push", "pull", "log"],
                        "description": "Git operation to perform",
                    },
                    "message": {
                        "type": "string",
                        "description": "Commit message (required for 'commit'), or number of commits for 'log'",
                    },
                    "branch": {
                        "type": "string",
                        "description": "Branch name (optional)",
                    },
                    "target": {
                        "type": "string",
                        "enum": ["dev", "prod"],
                        "description": "Target environment: 'dev' for editing code, 'prod' for viewing tasks (default: dev)",
                    },
                },
                "required": ["action"],
            },
        ),
        Tool(
            name="db_query",
            description="Execute SQL queries directly on the helpdesk MySQL database. Use SELECT to read, INSERT to create, UPDATE to modify, DELETE to remove. For creating a ticket: INSERT INTO helpdesk_tickets (title, description, status, requester_id) VALUES ('title', 'desc', 'open', 1); then INSERT INTO helpdesk_ticket_assignees (ticket_id, user_id, status) VALUES (LAST_INSERT_ID(), 1, 'active');",
            handler=db_query,
            input_schema={
                "type": "object",
                "properties": {
                    "sql": {
                        "type": "string",
                        "description": "SQL query to execute (SELECT, INSERT, UPDATE, DELETE, SHOW, DESCRIBE, etc.)",
                    },
                },
                "required": ["sql"],
            },
        ),
        Tool(
            name="db_schema",
            description="Explore the MySQL database schema. List all tables or describe a specific table structure (columns, types, keys).",
            handler=db_schema,
            input_schema={
                "type": "object",
                "properties": {
                    "table": {
                        "type": "string",
                        "description": "Table name to describe (optional - if omitted, lists all tables)",
                    },
                },
            },
        ),
    ]
    tool_registry.register_many(tools)
