import json
import typing
from http import HTTPStatus

import aiohttp
import databases
import datetime
import random
import hashlib
import time
import os

from fastapi import Request, Response
from fastapi.responses import JSONResponse

db = databases.Database("postgresql://{}@db:5432/{}".format(
    os.getenv("POSTGRES_USER"),
    os.getenv("POSTGRES_DB"),
), password=os.getenv("POSTGRES_PASSWORD"))


# wordlist singleton, why not
class Wordlist:
    wordlist = None

    def __init__(self):
        pass

    @classmethod
    def get_list(cls):
        if cls.wordlist is None:
            print(os.listdir())
            with open("words.txt", "r") as words:
                cls.wordlist = words.read().split("\n")
        return cls.wordlist


class HttpClient:
    session = None

    def __init__(self):
        pass

    def start(self):
        self.session = aiohttp.ClientSession()

    async def stop(self):
        await self.session.close()
        self.session = None

    def __call__(self) -> aiohttp.ClientSession:
        return self.session


class ApiException(Exception):
    def __init__(self, message: str, status_code: int):
        self.message = message
        self.status_code = status_code

client_id = os.getenv("CLIENT_ID")
client_secret = os.getenv("CLIENT_SECRET")
_grant_type = "authorization_code"
_headers = {'Content-Type': 'application/x-www-form-urlencoded'}


def gen_hash(text_to_hash: str):
    return hashlib.md5(bytes(text_to_hash, "utf-8")).hexdigest()[:10]


def gen_csrf():
    return gen_hash(str(random.SystemRandom().random() + time.time()))


def gen_mc_secret():
    return gen_csrf()


def validate_internal_request(req: Request) -> typing.Optional[Response]:
    if 'Authorization' not in req.headers:
        return JSONResponse({'error': 'This internal endpoint requires a secret token.'},
                            HTTPStatus.UNAUTHORIZED)
    if req.headers['Authorization'] != "Bearer " + os.getenv('INTERNAL_API_SECRET'):
        return JSONResponse({'error': 'The provided secret token is invalid.'},
                            HTTPStatus.FORBIDDEN)
    return None


def gen_discord_oauth_payload(code: str, redirect_uri: str):
    return {
        "client_id": client_id,
        "client_secret": client_secret,
        "grant_type": _grant_type,
        "code": code,
        "redirect_uri": redirect_uri
    }


async def get_user_auth_data(http_client: aiohttp.ClientSession,
                        code: str,
                        redirect_uri: str) -> typing.Dict[str, typing.Any]:
    if code is None:
        raise ApiException("This page must be accessed through the Discord OAuth flow.",
                           HTTPStatus.UNAUTHORIZED)
    res = await http_client.post("https://discord.com/api/oauth2/token",
                                 data=gen_discord_oauth_payload(code, redirect_uri),
                                 headers=_headers)
    print(res.status)
    if res.status != 200:
        raise ApiException("Failed to retrieve OAuth data. "
                           "Please ensure you are not trying to break our website.",
                           HTTPStatus.FORBIDDEN)
    res = json.loads(await res.read())
    access_token: str = res["access_token"]
    refresh_token: str = res["refresh_token"]
    headers: dict[str, str] = {"Authorization": f"Bearer {access_token}"}
    res = await http_client.get("https://discord.com/api/v9/users/@me", headers=headers)
    res = json.loads(await res.read())
    # web token secret
    secret: str = gen_hash(access_token + res["id"])
    return {
        "id": int(res["id"]),
        "username": res["username"],
        "discriminator": int(res["discriminator"]),
        "avatar": f"https://cdn.discordapp.com/avatars/{res['id']}/{res['avatar']}.jpg",
        "secret": secret,
        "accesstoken": access_token,
        "refreshtoken": refresh_token
    }


async def get_session_data(req: Request) -> typing.Optional[typing.Dict[str, typing.Any]]:
    secret = req.cookies.get("webToken")
    status = await validate_user(secret)
    if not status:
        return None
    return dict(await db.fetch_one("SELECT * FROM users WHERE webToken = :secret", {"secret": secret}))


async def get_user_data(user_id: int) -> typing.Optional[typing.Dict[str, typing.Any]]:
    user = await db.fetch_one("SELECT * FROM users WHERE snowflake = :id", {"id": user_id})
    if user is None:
        return None
    return dict(user)


async def validate_user(session_token: str):
    users = await db.fetch_one("SELECT * from users where webToken = :sess_token",
                               {"sess_token": session_token})
    return bool(users)


async def validate_csrf(session_data):
    row = dict(await db.fetch_one("SELECT * FROM users WHERE snowflake = :id", {"id": session_data["snowflake"]}))
    if row["csrftoken"] != session_data["csrftoken"]:
        return InvalidCSRFToken()
    if datetime.datetime.utcnow() > row["csrfexpiry"]:
        new_token = gen_csrf()
        new_expiry = datetime.datetime.utcnow() + datetime.timedelta(hours=12)
        await db.execute("UPDATE users SET csrfToken = :csrfToken, csrfExpiry = :csrfExpiry",
                         {"csrfToken": new_token, "csrfExpiry": new_expiry})
        return ExpiredCSRFToken()
    # -------------------------
    # if csrf_token is not None:
    #     if users["csrfToken"] is not csrf_token:
    #         return InvalidCSRFToken()
    #
    #     if datetime.datetime.utcnow() > users["csrfexpiry"]:
    #         new_token = gen_csrf()
    #         new_expiry = datetime.datetime.utcnow() + datetime.timedelta(hours=12)
    #         await db.execute("UPDATE users SET csrfToken = :csrfToken, csrfExpiry = :csrfExpiry",
    #                          {"csrfToken": new_token, "csrfExpiry": new_expiry})
    #         return ExpiredCSRFToken()


async def get_user_profile_data(user_id:int) -> typing.Optional[typing.Dict[str, typing.Any]]:
    user = await db.fetch_one("SELECT * FROM users WHERE snowflake = :id", {"id": user_id})
    if user is None:
        return None
    return {
        'name': user['name'],
        'discriminator': user['discriminator'],
        'avatar': user['avatar'],
        'diamonds': user['diamonds']
    }


class InvalidCSRFToken(Exception):
    pass


class ExpiredCSRFToken(Exception):
    pass

class NoUser(Exception):
    pass
