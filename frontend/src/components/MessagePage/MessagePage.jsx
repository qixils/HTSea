import style from './style.module.scss';

import {useCallback} from 'react';
import {useSelector, useDispatch} from 'react-redux';
import {useParams, Link} from 'react-router-dom';  

import MessageList from '../MessageList/MessageList';

import {MESSAGE_IDLE, getMessage, MESSAGE_UPDATING, MESSAGE_SUCCESS} from '../../redux/message';

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

    if (messageState.status !== MESSAGE_SUCCESS || !messageState.data.success) {
        return <div>TODO: ERROR</div>
    }

    const messageData = messageState.data;
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