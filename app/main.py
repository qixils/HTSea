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
    print("current testing url: "
          "http://localhost:8000/api/users/connect?uuid=a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11&secret=abcde")
    # INSERT INTO queue (mcuuid, secret) VALUES ('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'abcde');


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


# http://localhost:8000/api/users/connect?uuid=a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11&secret=abcde
# upon generation of the connect link by the plugin, the plugin inserts into table `queue` the uuid and random secret
@app.get("/api/users/connect")
async def connect_minecraft_acct(uuid: str, secret: str):
    db_users = await db.fetch_all("SELECT * FROM queue WHERE mcuuid=:uuid", {"uuid": uuid})
    if len(db_users) < 1:
        return "how did this happen    stop tampering bitchhhfh"
    rres = RedirectResponse("https://discord.com/api/oauth2/authorize?client_id=956657160979374090&"
                            "redirect_uri=http%3A%2F%2Flocalhost%3A8000%2Fapi%2Fusers%2Fregistermc&"
                            "response_type=code&scope=identify")
    rres.set_cookie(key="mcuuid", value=uuid)
    rres.set_cookie(key="mcsecret", value=secret)
    return rres
