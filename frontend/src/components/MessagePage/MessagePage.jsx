import style from './style.module.scss';

import {useCallback} from 'react';
import {useSelector, useDispatch} from 'react-redux';
import {useParams} from 'react-router-dom';  

import MessageList from '../MessageList/MessageList';

import {MESSAGE_IDLE, getMessage, MESSAGE_UPDATING, MESSAGE_SUCCESS} from '../../redux/message';

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

    return (
        <div className={style['message-page']}>
            <MessageList messageData={messageData} />
        </div>
    )
};

export default MessagePage;