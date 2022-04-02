from http import HTTPStatus
from uuid import uuid4
import json

from fastapi import APIRouter, Depends, Request, Response
from fastapi.responses import JSONResponse
from fastapi.encoders import jsonable_encoder
from ..dependencies import *

route = APIRouter(prefix="/api")

# TODO vary the cost of minting an HTNFT
MINT_COST = 1


@route.post("/mint_check", dependencies=[Depends(validate_internal_request)])
async def mint_check(req: Request,
                     resp: Response):
    data = await req.json()
    user = await get_user_data(int(data['user_id']))
    if user is None:
        return JSONResponse(content=jsonable_encoder({
            'success': False,
            'error': 'USER_NOT_REGISTERED'
        }))
    row = await db.fetch_one("SELECT * FROM htnfts WHERE messageSnowflake = :id", {"id": int(data['message_id'])})
    if row is not None:
        return JSONResponse(content=jsonable_encoder({
            'success': False,
            'error': 'ALREADY_MINTED'
        }))
    
    diamonds = user['diamonds']
    if diamonds < MINT_COST:
        return JSONResponse(content=jsonable_encoder({
            'success': False,
            'error': 'NOT_ENOUGH_DIAMONDS',
            'user_diamonds': diamonds,
            'cost': MINT_COST
        }))

    return JSONResponse(content=jsonable_encoder({
        'success': True,
        'user_diamonds': diamonds,
        'cost': MINT_COST
    }))


@route.post("/mint_htnft", dependencies=[Depends(validate_internal_request)])
async def mint_htnft(req: Request,
                     resp: Response):
    data = await req.json()
    if data['message']['authorID'] != data['user_id']:
        return JSONResponse(content=jsonable_encoder({
            'success': False,
            'error': 'CANNOT_MINT_OTHERS_MESSAGES'
        }))

    async with db.transaction():
        user = await get_user_data(int(data['user_id']))
        if user is None:
            return JSONResponse(content=jsonable_encoder({
                'success': False,
                'error': 'USER_NOT_REGISTERED'
            }))
        diamonds = user['diamonds']
        if diamonds < MINT_COST:
            return JSONResponse(content=jsonable_encoder({
                'success': False,
                'error': 'NOT_ENOUGH_DIAMONDS',
                'user_diamonds': diamonds,
                'cost': MINT_COST
            }))
        
        mint_time = datetime.datetime.now()
        
        await db.execute("INSERT INTO htnfts (messageSnowflake, channelSnowflake, guildSnowflake, authorSnowflake, content, mintedAt, embeds, attachments, currentOwner) "
                        "VALUES (:message_snowflake, :channel_snowflake, :guild_snowflake, :author_snowflake, :content, :minted_at, :embeds, :attachments, :owner)", {
                            'message_snowflake': int(data['message']['id']),
                            'channel_snowflake': int(data['message']['channelID']),
                            'guild_snowflake': int(data['message']['guildID']),
                            'author_snowflake': int(data['message']['authorID']),
                            'content': data['message']['content'],
                            'minted_at': mint_time,
                            'embeds': [json.dumps(embed) for embed in data['message']['embeds']],
                            'attachments': [int(attachment_id) for attachment_id in data['message']['attachments']],
                            'owner': int(user['snowflake'])
                        })
        
        await db.execute_many("INSERT INTO referenced_users (nftID, snowflake, name, nickname, discriminator, avatar) "
                              "VALUES (:nft_id, :snowflake, :name, :nickname, :discriminator, :avatar)", [{
                                  'nft_id': int(data['message']['id']),
                                  'snowflake': int(user['id']),
                                  'name': user['name'],
                                  'nickname': user['nickname'],
                                  'discriminator': user['discriminator'],
                                  # TODO save avatars
                                  'avatar': user['avatar']
                              } for user in data['users']])
        
        await db.execute_many("INSERT INTO referenced_channels (nftID, snowflake, type, name) "
                              "VALUES (:nft_id, :snowflake, :type, :name)", [{
                                  'nft_id': int(data['message']['id']),
                                  'snowflake': int(channel['id']),
                                  'type': channel['type'],
                                  'name': channel['name']
                              } for channel in data['channels']])
        
        await db.execute_many("INSERT INTO referenced_roles (nftID, snowflake, name, color, position) "
                              "VALUES (:nft_id, :snowflake, :name, :color, :position)", [{
                                  'nft_id': int(data['message']['id']),
                                  'snowflake': int(role['id']),
                                  'name': role['name'],
                                  'color': role['color'],
                                  'position': role['position']
                              } for role in data['roles']])
        
        await db.execute_many("INSERT INTO referenced_attachments (nftID, snowflake, url, name, height, width, spoiler) "
                              "VALUES (:nft_id, :snowflake, :url, :name, :height, :width, :spoiler)", [{
                                  'nft_id': int(data['message']['id']),
                                  'snowflake': int(attachment['id']),
                                  'url': attachment['url'],
                                  'name': attachment['name'],
                                  'height': attachment['height'],
                                  'width': attachment['width'],
                                  'spoiler': attachment['spoiler'],
                              } for attachment in data['attachments']])
        
        await db.execute("UPDATE users SET diamonds = "
                        "diamonds - :cost "
                        "WHERE snowflake = :user_id",
                        {
                            "user_id": int(data['user_id']),
                            "cost": MINT_COST
                        })
        
        await db.execute("INSERT INTO transactions (id, message, seller, buyer, cost, timestamp) "
                        "VALUES (:tid, :nft_id, NULL, :minter_id, :cost, :timestamp)", {
                            'tid': uuid4(),
                            'nft_id': int(data['message']['id']),
                            'minter_id': int(data['user_id']),
                            'cost': MINT_COST,
                            'timestamp': mint_time
                        })


    return JSONResponse(content=jsonable_encoder({
        'success': True,
        'user_diamonds': user['diamonds'],
        'cost': MINT_COST,
    }))

async def get_htnft(message_id: int):
    if message_id > (2**63 - 1) or message_id < 0:
        raise ApiException(
            status_code=HTTPStatus.BAD_REQUEST,
            error='INVALID_ID'
        )
    row = await db.fetch_one("SELECT * FROM htnfts WHERE messageSnowflake = :id", {"id": message_id})
    if row is None:
        raise ApiException(status_code=HTTPStatus.NOT_FOUND)
    return row

@route.get("/messages/{message_id}")
async def get_message(req: Request, resp: Response, message_id: int, row = Depends(get_htnft)):
    
    users = {str(user['snowflake']): {
        'id': str(user['snowflake']),
        'name': user['name'],
        'nickname': user['nickname'],
        'discriminator': user['discriminator'],
        'avatar': user['avatar']
    } for user in await db.fetch_all("SELECT * from referenced_users WHERE nftid = :id", {'id': message_id})}
    
    channels = {str(channel['snowflake']): {
        'id': str(channel['snowflake']),
        'type': channel['type'],
        'name': channel['name']
    } for channel in await db.fetch_all("SELECT * from referenced_channels WHERE nftid = :id", {'id': message_id})}

    roles = {str(role['snowflake']): {
        'id': str(role['snowflake']),
        'name': role['name'],
        'color': role['color'],
        'position': role['position']
    } for role in await db.fetch_all("SELECT * from referenced_roles WHERE nftid = :id", {'id': message_id})}

    attachments = {str(attachment['snowflake']): {
        'id': str(attachment['snowflake']),
        'url': attachment['url'],
        'name': attachment['name'],
        'height': attachment['height'],
        'width': attachment['width'],
        'spoiler': attachment['spoiler']
    } for attachment in await db.fetch_all("SELECT * from referenced_attachments WHERE nftid = :id", {'id': message_id})}

    current_owner_profile = await get_user_profile_data(row['currentowner'])
    highest_offer = await db.fetch_one("SELECT * FROM offers WHERE id=:id ORDER BY price DESC",
                                       {'id': row['messagesnowflake']})
    if highest_offer:
        highest_offer = dict(highest_offer)
        del highest_offer['id']
    message = {
        'messageID': str(row['messagesnowflake']),
        'channelID': str(row['channelsnowflake']),
        'guildID': str(row['guildsnowflake']),
        'authorID': str(row['authorsnowflake']),
        'content': row['content'],
        'mintedAt': None if row['mintedat'] is None else row['mintedat'].timestamp(),
        'currentPrice': row['currentprice'],
        'currentOwner': current_owner_profile,
        'highestOffer': highest_offer,
        'embeds': [json.loads(embed) for embed in row['embeds']],
        'attachments': [str(attachment_id) for attachment_id in row['attachments']]
    }

    payload = {
        'success': 'true',
        'message': message,
        'users': users,
        'channels': channels,
        'roles': roles,
        'attachments': attachments
    }

    return JSONResponse(content=jsonable_encoder(payload))


@route.post("/messages/{message_id}/sell")
async def sell_htnft(req: Request, resp: Response, message_id: int, user=Depends(session_user), row = Depends(get_htnft)):
    current_owner = row['currentowner']

    if current_owner != user['snowflake']:
        return JSONResponse(content=jsonable_encoder({
            'success': False,
            'error': 'NOT_OWNER',
            'comment': 'You do not own this message'
        }), status_code=403)

    data = await req.json()
    if 'price' not in data or not isinstance(data['price'], int) or data['price'] < 0:
        return JSONResponse(content=jsonable_encoder({
            'success': False,
            'error': 'Bad Request'
        }), status_code=400)

    await db.execute("UPDATE htnfts SET currentPrice = :price "
                    "WHERE messageSnowflake = :id",
                    {
                        'price': data['price'],
                        'id': message_id
                    })

    return JSONResponse(content=jsonable_encoder({'success': True}))


@route.post("/messages/{message_id}/cancel_sale")
async def cancel_htnft_sale(req: Request, resp: Response, message_id: int, user = Depends(session_user), row = Depends(get_htnft)):
    current_owner = row['currentowner']
    if current_owner != user['snowflake']:
        return JSONResponse(content=jsonable_encoder({
            'success': False,
            'error': 'NOT_OWNER',
            'comment': 'You do not own this message'
        }), status_code=403)

    await db.execute("UPDATE htnfts SET currentPrice = NULL "
                    "WHERE messageSnowflake = :id", {'id': message_id})

    return JSONResponse(content=jsonable_encoder({'success': True}))


@route.post("/messages/{message_id}/buy")
async def buy_htnft(req: Request, resp: Response, message_id: int, new_owner = Depends(session_user), row = Depends(get_htnft)):
    async with db.transaction():
        if row['currentprice'] is None:
            return JSONResponse(content=jsonable_encoder({
                'success': False,
                'error': 'NOT_FOR_SALE'
            }), status_code=400)
    
        if new_owner['diamonds'] < row['currentprice']:
            return JSONResponse(content=jsonable_encoder({
                'success': False,
                'error': 'NOT_AFFORDABLE'
            }), status_code=400)

        current_owner = row['currentowner']
        if current_owner == new_owner['snowflake']:
            return JSONResponse(content=jsonable_encoder({
                'success': False,
                'error': 'CANNOT_SELL_TO_SELF'
            }), status_code=400)
        
        await db.execute("INSERT INTO transactions (id, message, seller, buyer, cost, timestamp) "
                "VALUES (:tid, :nft_id, :seller, :buyer, :cost, :timestamp)", {
                    'tid': uuid4(),
                    'nft_id': row['messagesnowflake'],
                    'seller': current_owner,
                    'buyer': new_owner['snowflake'],
                    'cost': row['currentprice'],
                    'timestamp': datetime.datetime.now()
                })
        await db.execute("UPDATE htnfts SET (currentPrice, currentOwner) = (NULL, :owner) "
                "WHERE messageSnowflake = :id", {'id': message_id, 'owner': new_owner['snowflake']})
        await db.execute("UPDATE users SET diamonds = diamonds - :price "
                "WHERE snowflake = :id", {
                    'id': new_owner['snowflake'],
                    'price': row['currentprice']
                })
        await db.execute("UPDATE users SET diamonds = diamonds + :price "
                "WHERE snowflake = :id", {
                    'id': current_owner,
                    'price': row['currentprice']
                })

    return JSONResponse(content=jsonable_encoder({
        'success': True,
        'newDiamonds': new_owner['diamonds'] - row['currentprice']
    }))

async def transactions_to_api_response(txs):
    user_ids = set()
    for row in txs:
        if row['seller'] is not None:
            user_ids.add(row['seller'])
        user_ids.add(row['buyer'])
    
    users = await db.fetch_all("SELECT * FROM users WHERE snowflake = ANY(:ids)", {'ids': user_ids})
    users_resp = [user_to_api_response(user) for user in users]
    return {
        'transactions': [{
        'id': str(tx['id']),
        'messageID': str(tx['message']),
        'seller': None if tx['seller'] is None else str(tx['seller']),
        'buyer': str(tx['buyer']),
        'cost': tx['cost'],
        'timestamp': tx['timestamp'].timestamp()
    } for tx in txs],
        'users': users_resp
    }

@route.get('/recent_transactions')
async def recent_transactions(req: Request, resp: Response, before: float = None):
    if before is None: before = datetime.datetime.now().timestamp()
    rows = await db.fetch_all("SELECT * FROM transactions WHERE timestamp < :before ORDER BY timestamp DESC LIMIT 10", {'before': datetime.datetime.fromtimestamp(before)})

    payload = await transactions_to_api_response(rows)
    return JSONResponse(content=jsonable_encoder(payload))
