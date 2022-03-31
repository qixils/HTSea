import style from './style.module.scss';

import {useCallback} from 'react';
import {useSelector, useDispatch} from 'react-redux';
import {useParams, Link} from 'react-router-dom';  

import MessageList from '../MessageList/MessageList';

import {MESSAGE_IDLE, getMessage, MESSAGE_UPDATING, MESSAGE_SUCCESS} from '../../redux/message';

function m(id) {
    return {
        users: {
            "98765": {
                'id': "98765",
                'name': "ysrutnsrytunrs",
                'nickname': "ysrutnsrytunrs",
                'discriminator': "1291",
                'avatar': "x"
            },
            "99999": {
                'id': "98765",
                'name': "usnysrutkrse",
                'nickname': "usnysrutkrse",
                'discriminator': "4140",
                'avatar': "x"
            }
        },
        channels: {
            "54321": {
                'id': "54321",
                'type': 0,
                'name': "unserious"
            }
        },
        // roles: {str(role['snowflake']): {
        //     'id': str(role['snowflake']),
        //     'name': role['name'],
        //     'color': role['color'],
        //     'position': role['position']
        // } for role in await db.fetch_all("SELECT * from referenced_roles WHERE nftid = :id", {'id': message_id})},
        // attachments: {str(attachment['snowflake']): {
        //     'id': str(attachment['snowflake']),
        //     'url': attachment['url'],
        //     'name': attachment['name'],
        //     'height': attachment['height'],
        //     'width': attachment['width'],
        //     'spoiler': attachment['spoiler']
        // } for attachment in await db.fetch_all("SELECT * from referenced_attachments WHERE nftid = :id", {'id': message_id})},
        message: {
            'messageID': "12345",
            'channelID': "54321",
            'guildID': "65432",
            'authorID': "98765",
            'content': "i am pinging <@99999>",
            'mintedAt': Date.now(), // idk what .timestamp() is
            'currentPrice': 9999,
            'embeds': [],
            'attachments': []
        },
        success: true
    };
}

function Button(props) {
    return <button className={style["nftbutton"]} onClick={props.click}>{props.content}</button>;
}

const MessagePage = () => {
    const {id} = useParams();
    const messageState = useSelector(state => state.message);
    const dispatch = useDispatch();
    const getMessageCallback = useCallback(() => getMessage(dispatch, id), [dispatch, id]);

    console.log(messageState);

    if (
        (messageState.status === MESSAGE_IDLE) ||
        (messageState.data?.message && messageState.data?.message.messageID !== id)
    ) {
        getMessageCallback(id);
        return <div>TODO: LOADING</div>;
    }

    if (messageState.status === MESSAGE_UPDATING) {
        return <div>TODO: LOADING</div>
    }

    // if (messageState.status !== MESSAGE_SUCCESS || !messageState.data.success) {
    //     return <div>TODO: ERROR</div>
    // }

    // const messageData = messageState.data;

    const messageData = m(id);
    let {message, users} = messageData;

    return (
        <div className={style['message-page']}>
            <div>
                <h1>Malignant Message #{message.messageID}</h1>
                <div className={style["author-header"]}>Owned by <Link to={`/users/${message.authorID}`}>{users[message.authorID].name}#{users[message.authorID].discriminator}</Link></div>
            </div>
            <MessageList messageData={messageData} />
            {/* i thiiiiink it's Make offer OR Buy Price & Buy It Now, not both at the same time??? */}
            <div>
                <Button onClick={()=>{}} content="Make offer" />
            </div>
            {/* transaction table here */}
        </div>
    );
};

export default MessagePage;