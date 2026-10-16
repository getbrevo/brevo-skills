## Brevo connection rules

- Every Brevo call goes through the Brevo MCP server's tools. The user's connection carries
  their authentication (OAuth). **Never ask for an API key, never ask the user to paste a key
  into the chat, and never put a key in a file or command.**
- If a tool returns 401 or 403, ask the user to reconnect Brevo in their agent's settings.
- If a tool the skill needs is missing from your tool list, stop and say that the user's
  Brevo connection doesn't offer this feature yet. Don't improvise with other tools.
- Show a tool's error message as returned, after a plain-language summary. Don't invent a
  cause the tool didn't give.
