<p align="center" draggable="false"><img src="https://github.com/AI-Maker-Space/LLM-Dev-101/assets/37101144/d1343317-fa2f-41e1-8af1-1dbb18399719"
     width="200px"
     height="auto"/>
</p>

<h1 align="center" id="heading">Session 8: Model Context Protocol (MCP)</h1>

### [Quicklinks]()

| Session Sheet | Recording | Slides | Repo | Homework | Feedback |
|:--------------|:----------|:-------|:-----|:---------|:---------|
| [Session 8: MCP](https://github.com/AI-Maker-Space/The-AI-Engineering-Certification-v1.0/tree/main/00_Docs/Modules/08_MCP) |[Recording!](https://us02web.zoom.us/rec/share/rqw5I5hwbOOHy8TrGjnu0IjDJi53ykHb0k897jYfyHqZpgRhUuFP4A18d4NrcEKS.18sNk6Do9XwyaVUy) <br> passcode: `E56&^V+8`| [Session 8 Slides](https://canva.link/k8cixqgkfeghdsn) |You are here! | [Session 8 Assignment](https://forms.gle/TcjjChq38ydMjuqn8) | [Feedback 6/25](https://forms.gle/DvcWDgBXatBWCXqi7) |

## Useful Resources

**MCP (Model Context Protocol)**
- [MCP Official Docs](https://modelcontextprotocol.io/) — Spec, tutorials, and guides
- [MCP-UI](https://mcpui.dev/) — Official standard for interactive UI in MCP
- [MCP Auth Guide (Auth0)](https://auth0.com/blog/mcp-specs-update-all-about-auth/) — Deep dive into MCP auth spec updates

## Main Assignment

In this session, you will build an MCP server with OAuth authentication — a cat
shop application that exposes tools for browsing products, managing a cart, and
checking out.

The main entry point is:

```text
server.py
```

The server implementation lives in:

```text
app/
```

Available MCP tools:

- `list_products`
- `get_product`
- `add_to_cart`
- `view_cart`
- `remove_from_cart`
- `checkout`
- `search_products` (added in Activity 1)

## Setup

From this folder:

```bash
uv sync
```

Copy the example env file and fill in your OpenAI API key:

```bash
cp .env.example .env
```

## Running the MCP Server

Run the server locally:

```bash
uv run server.py
```

The server starts on `http://localhost:8000`.

### Expose the server with ngrok

In a separate terminal, start an ngrok tunnel:

```bash
ngrok http 8000
```

Copy the ngrok forwarding URL (e.g. `https://xxxx-xx-xx-xx-xx.ngrok-free.app`) and
restart the server with it:

```bash
ISSUER_URL=https://xxxx-xx-xx-xx-xx.ngrok-free.app uv run server.py
```

> **Note:** The `ISSUER_URL` must match the public URL clients use to reach the
> server, otherwise OAuth authentication will fail.

## Outline

### Breakout Room #1

- Set up the MCP server with OAuth and the product database
- Explore the MCP tools: `list_products`, `get_product`, `add_to_cart`, `view_cart`, `remove_from_cart`, `checkout`

### Breakout Room #2

- Connect an MCP client to the server
- Build an end-to-end interaction flow using the MCP tools

## Ship

The completed MCP server and client integration!

### Deliverables

- A short Loom of either:
  - the MCP server you built and a demo of the client interacting with it; or
  - the notebook you created for the Advanced Build

## Share

Make a social media post about your final application!

### Deliverables

- Make a post on any social media platform about what you built!

Here's a template to get you started:

```
🚀 Exciting News! 🚀

I am thrilled to announce that I have just built and shipped an MCP server with OAuth authentication! 🎉🤖

🔍 Three Key Takeaways:
1️⃣
2️⃣
3️⃣

Let's continue pushing the boundaries of what's possible in the world of AI and tool integration. Here's to many more innovations! 🚀
Shout out to @AIMakerspace !

#MCP #ModelContextProtocol #OAuth #Innovation #AI #TechMilestone

Feel free to reach out if you're curious or would like to collaborate on similar projects! 🤝🔥
```

## Submitting Your Homework 

Follow these steps to prepare and submit your homework assignment:

1. Review the MCP server code in `server.py` and the `app/` directory
2. Run the MCP server locally using `uv run server.py`
3. Connect to the server using an MCP client (e.g., Claude Desktop, or a custom client)
4. Test all available tools: browsing products, adding to cart, viewing cart, removing items, and checkout
5. Record a Loom video reviewing what you have learned from this session

## Questions

### Question #1

Why is OAuth important for MCP servers, and what security considerations should you keep in mind when exposing tools to AI clients?

#### Answer

OAuth matters here because MCP tools can do real things — in our case, adding items to a cart and completing a purchase. Without auth, any client that can reach the server can call those tools on behalf of anyone. OAuth gives us identity: the server knows "who" is calling, which is what makes per-user state like `view_cart` and `checkout` work correctly.

A few security things worth keeping in mind when exposing tools to AI clients:

- **Tools can have side effects.** `checkout` places an order — that's irreversible. You want tight control over what triggers it. In this build, the system prompt explicitly tells the agent not to call checkout unless the user asks directly. That's an app-level guardrail on top of auth, not a replacement for it.
- **AI clients act on inferred intent.** A human user clicking a button is making a deliberate choice; an agent inferring "they probably want to buy it" is not the same thing. The more powerful the tool, the more careful you need to be about what's exposed and under what conditions it fires.
- **Dynamic client registration is convenient but loose.** This server allows any client to register, which is great for development but in a real deployment you'd want to restrict that — whitelist known clients or require manual approval.
- **Token scope limits blast radius.** Separating `read` and `write` scopes means a compromised read-only token can't trigger a checkout. Narrow scopes are worth the extra setup.

### Question #2

What is Streamable HTTP transport in MCP, and why might you expose a server publicly with OAuth instead of using a local stdio connection?

#### Answer

Streamable HTTP is an HTTP-based transport for MCP — the client sends requests over standard HTTP POST and the server can stream responses back using SSE (Server Sent Events) if needed. It's stateless from the transport layer's perspective, which makes it easy to deploy and proxy.

The alternative is stdio, where the server runs as a local subprocess and communicates over stdin/stdout. That's simpler it needs zero auth overhead, no networking but it's single-caller by design. Only the process that spawned it can talk to it, and there's no concept of user identity, so per-user state like a shopping cart doesn't exist.

Going with Streamable HTTP and OAuth made sense for this project as soon as we wanted:

- **Multiple users with their own carts.** stdio can't do this — there's no identity, so there's no "whose cart is this?"
- **Remote access.** ngrok tunnels work out of the box; you can point any MCP-compatible client at the URL and it just works.
- **Real auth flow.** OAuth with PKCE gives us proper token-based identity. The `OAuthClientProvider` handles token refresh automatically, so the session stays alive across multiple tool calls without the client having to think about it.

For a quick personal demo or a local dev tool, stdio is the right call — it's faster to set up and there's nothing to secure. But the moment you want multiple users, remote deployment, or any kind of stateful per-user behaviour, Streamable HTTP with OAuth is the only path that actually works.

## Activity 1: Extend the MCP Server

Add at least one new tool to the cat shop MCP server (e.g., `search_products`, `update_cart_quantity`, or `get_order_history`). Ensure the new tool integrates properly with the existing database and OAuth authentication. Demo the new tool through an MCP client and include it in your Loom video.

## Advanced Activity: Build a Custom MCP Client

Build a custom MCP client that connects to the cat shop server over Streamable HTTP, authenticates via OAuth, and orchestrates a multi-step shopping flow (browse → add to cart → checkout). Compare the developer experience of MCP-based tool integration vs. traditional REST API calls.

Include your findings and a demo in your Loom video.


Refer to advanced_client.ipynb for more information on building a custom MCP client.

## MCP vs Traditional REST

Some thoughts and a summary - If I already know the endpoints and I'm writing the client by hand, REST wins. MCP just makes me do more work for the same result — there's the protocol envelope to unwrap and the OAuth setup to wire up, when `httpx.get("/products")` would've done the job.

It flips once an AI agent is the one making the calls instead of me. `list_tools()` hands the agent the full list of what it can do, typed, at runtime, so it doesn't need to read any docs first. The schema lets it check its arguments before calling, every response comes back in the same shape so error handling doesn't change tool to tool, and auth is set up once on the transport so every call already carries the right user. So it comes down to who's calling: my code against endpoints I control, use REST; an agent that has to figure out the tools on its own, that's the whole point of MCP.

| Dimension | MCP | Traditional REST |
|---|---|---|
| Tool discovery | In-protocol JSON Schema via `list_tools()` | Out-of-band docs (OpenAPI, README) |
| Auth lifecycle | SDK-managed; token refresh automatic | Manual Bearer header per call; refresh DIY |
| Response parsing | Extra `json.loads(content[0].text)` unwrap | Direct `.json()` |
| Response shape | Always `CallToolResult` — uniform | Varies per endpoint and API designer |
| Type safety | `inputSchema` enables pre-call validation | Bespoke per endpoint |
| Multi-step session | Stateful; auth context maintained across calls | Stateless HTTP; auth repeated |
| AI agent integration | First-class — `list_tools()` → `call_tool()` | Requires custom wrappers and prompt engineering |
| Setup complexity | ~40 lines of OAuth boilerplate | `httpx.AsyncClient(base_url=..., headers=...)` |