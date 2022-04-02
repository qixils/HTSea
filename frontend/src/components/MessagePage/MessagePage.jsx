import style from './style.module.scss';

import {useCallback, useState} from 'react';
import {useSelector, useDispatch} from 'react-redux';
import {useParams, Link} from 'react-router-dom';
import classNames from 'classnames';

import Diamonds from '../Diamonds/Diamonds';
import MessageList from '../MessageList/MessageList';
import {BlueButton, WhiteButton} from '../Sea/SeaButton';
import Modal from '../Modal/Modal';
import Loader from '../Loader/Loader';
import ErrorPage from '../ErrorPage/ErrorPage';

import {getMessage, buyMessage, sellMessage, cancelMessageSale, MESSAGE_IDLE, MESSAGE_UPDATING, MESSAGE_SUCCESS} from '../../redux/message';
import {getSession, SESSION_IDLE, SESSION_PENDING, SESSION_SUCCESS} from '../../redux/session';

const ADJECTIVES = [
    'Magnificent',
    'Marvelous',
    'Middling',
    'Masterpiece',
    'Maniacal',
    'Majestic',
    'Momentous',
    'Mysterious'
];

const MessagePage = () => {
    const {id} = useParams();
    const [messageState, sessionState] = useSelector(state => [state.message, state.session]);
    const dispatch = useDispatch();
    const [buyModalOpen, setBuyModalOpen] = useState(false);
    const [sellModalOpen, setSellModalOpen] = useState(false);
    const [salePrice, setSalePrice] = useState(0);
    const getMessageCallback = useCallback(() => getMessage(dispatch, id), [dispatch, id]);
    const getSessionCallback = useCallback(() => getSession(dispatch, id), [dispatch, id]);
    const buyMessageCallback = useCallback(() => {
        buyMessage(dispatch, id);
        setBuyModalOpen(false);
    }, [dispatch, id, setBuyModalOpen]);
    const sellMessageCallback = useCallback(() => {
        sellMessage(dispatch, id, salePrice);
        setSellModalOpen(false);
    }, [dispatch, id, salePrice, setSellModalOpen]);
    const cancelMessageSaleCallback = useCallback(() => cancelMessageSale(dispatch, id), [dispatch, id]);

    if (sessionState.status === SESSION_IDLE) {
        getSessionCallback();
        return <div className={style.loading}><Loader /></div>;
    }

    if (
        (messageState.status === MESSAGE_IDLE) ||
        (messageState.id !== id)
    ) {
        getMessageCallback(id);
        return <div className={style.loading}><Loader /></div>;
    }

    if (messageState.status === MESSAGE_UPDATING || sessionState.status === SESSION_PENDING) {
        return <div className={style.loading}><Loader /></div>;
    }

    if (messageState.status !== MESSAGE_SUCCESS || !messageState.data.success || sessionState.status !== SESSION_SUCCESS) {
        return <ErrorPage error={messageState.error || sessionState.error} />
    }

    const messageData = messageState.data;
    const {message} = messageData;
    const owner = message.currentOwner;
    const {currentPrice} = messageState.data.message;

    let buySellAction = null;
    if (sessionState.session.logged_in) {
        const {user} = sessionState.session;
        if (owner.id === user.snowflake) {
            // we own this NFT
            if (currentPrice === null) {
                // NFT is not for sale; let the owner sell it
                buySellAction = <BlueButton onClick={() => setSellModalOpen(true)}>Put up for sale</BlueButton>;
            } else {
                // NFT is for sale; let the owner cancel the sale
                buySellAction = <BlueButton onClick={cancelMessageSaleCallback}>Remove from market</BlueButton>;
            }
        } else {
            // we do not own this NFT
            if (currentPrice !== null) {
                buySellAction = <BlueButton onClick={() => setBuyModalOpen(true)} disabled={user.diamonds < currentPrice}>Buy now</BlueButton>;
            }
        }
    }

    const adjective = ADJECTIVES[Number(message.messageID.slice(-5)) % ADJECTIVES.length];

    return (
        <div className={style['message-page']}>
            <Modal isOpen={buyModalOpen} onClose={() => setBuyModalOpen(false)}>
                <div className={style['modal-contents']}>
                    <div className={style['modal-row']}>Buy this message for <Diamonds diamonds={currentPrice}/>?</div>
                    <div className={classNames(style['modal-row'], style['modal-buttons'])}>
                        <BlueButton onClick={buyMessageCallback}>Buy</BlueButton>
                        <WhiteButton onClick={() => setBuyModalOpen(false)}>Cancel</WhiteButton>
                    </div>
                </div>
            </Modal>
            <Modal isOpen={sellModalOpen} onClose={() => setSellModalOpen(false)}>
                <div className={style['modal-contents']}>
                    <div className={style['modal-row']}>Sale price: <input type="number" min="0" step="0.001" value={salePrice.toFixed(3)} onChange={event => {
                        const numVal = parseFloat(event.target.value);
                        if (Number.isFinite(numVal)) {
                            setSalePrice(numVal);
                        }
                    }} /></div>
                    <div className={classNames(style['modal-row'], style['modal-buttons'])}>
                        <BlueButton onClick={sellMessageCallback}>Sell</BlueButton>
                        <WhiteButton onClick={() => setSellModalOpen(false)}>Cancel</WhiteButton>
                    </div>
                </div>
            </Modal>
            <div>
                <h1>{adjective} Message #{message.messageID}</h1>
                <div className={style.owner}>Owned by <Link to={`/user/${owner.id}`}>{owner.name}#{owner.discriminator}</Link></div>
            </div>
            <MessageList messageData={messageData} />
            {currentPrice || buySellAction ?
            <div className={style["sale-wrapper"]}>
                {currentPrice !== null ?
                    <div>Current price: <Diamonds diamonds={currentPrice} /></div> :
                    null}
                {buySellAction}
            </div> :
            null
            }
            
            {/* transaction table here */}
        </div>
    );
};

export default MessagePage;
