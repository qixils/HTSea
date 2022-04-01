from fastapi import FastAPI
from fastapi.responses import RedirectResponse
from fastapi.middleware.cors import CORSMiddleware
from urllib.parse import urlencode

from pkg.dependencies import *

from pkg.api import htnft
from pkg.api import users
from pkg.api import wordle

app = FastAPI()

# TODO: rework CORS permissions
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(htnft.route)
app.include_router(users.route)
app.include_router(wordle.route)


@app.on_event("startup")
async def startup():
    await db.connect()
    
    db_initialized = await db.execute("""
        SELECT EXISTS (SELECT 1 FROM information_schema.tables 
            WHERE table_name = 'users')
    """)

    if not db_initialized:
        raise Exception("Database has not been initialized. Initialize from the schemas.sql file :)")

    with open("words.txt", "r") as words:
        app.words = words.read().split("\n")
    print("current testing url: "
          "http://localhost:8000/api/users/connect?uuid=a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11&secret=abcde")
    # INSERT INTO queue (mcuuid, secret) VALUES ('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'abcde');


# http://localhost:8000/api/users/connect?uuid=a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11&secret=abcde
# upon generation of the connect link by the plugin, the plugin inserts into table `queue` the uuid and random secret
@app.get("/api/users/connect")
async def connect_minecraft_acct(uuid: str, secret: str):
    db_users = await db.fetch_one("SELECT * FROM queue WHERE mcuuid=:uuid AND secret=:secret",
                                  {"uuid": uuid, "secret": secret})
    if not db_users:
        return JSONResponse({'error': 'Invalid parameters'}, HTTPStatus.BAD_REQUEST)
    rres = RedirectResponse("https://discord.com/api/oauth2/authorize?client_id={}&"
                            "redirect_uri={}&response_type=code&scope=identify"
                            .format(client_id, urlencode(os.getenv("API_URL_PREFIX")
                                                         + "/api/users/registermc")))
    rres.set_cookie(key="mcuuid", value=uuid)
    rres.set_cookie(key="mcsecret", value=secret)
    return rres
