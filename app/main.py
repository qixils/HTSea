from fastapi import FastAPI
from fastapi.responses import RedirectResponse
from .dependencies import *

from .api import users
from .api import wordle

app = FastAPI()

app.include_router(users.route)
app.include_router(wordle.route)

@app.on_event("startup")
async def startup():
    await db.connect()
    await db.execute("CREATE TABLE IF NOT EXISTS users ()")
    with open("app/words.txt", "r") as words:
        app.words = words.read().split("\n")

@app.on_event("shutdown")
async def shutdown():
    await db.disconnect()


@app.get("/")
async def root():
    return await db.fetch_all("SELECT * FROM penis;")


@app.get("/exe/{cmd}")
async def exceut(cmd: str):
    return await db.execute(cmd)


@app.get("/hello/{name}")
async def say_hello(name: str):
    await db.execute("INSERT INTO penis (name) VALUES (:person_name)", {"person_name": name})
    return await db.fetch_all("SELECT * FROM penis;")


@app.get("/connect")
async def connect_minecraft_acct(uuid: str, secret: str):
    db_users = await db.fetch_all("SELECT * FROM users WHERE minecraft=:uuid", uuid)
    if len(db_users) > 0:
        return "ur already registered you dumb fuck"
    rres = RedirectResponse("https://discord.com/api/oauth2/authorize?client_id=956657160979374090&"
                            "redirect_uri=http%3A%2F%2Flocalhost%3A8000%2Fregistermc&response_type=code&scope=identify")
    rres.set_cookie(key="mcuuid", value=uuid)
    rres.set_cookie(key="mcsecret", value=secret)
    return rres
