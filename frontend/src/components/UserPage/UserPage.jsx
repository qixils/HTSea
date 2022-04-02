import style from './style.module.scss';

import {useCallback, useState} from 'react';
import {useSelector, useDispatch} from 'react-redux';
import {useParams, Link} from 'react-router-dom';

import Avatar from '../Avatar/Avatar';
import Loader from '../Loader/Loader';
import Diamonds from '../Diamonds/Diamonds';
import MessageList from '../MessageList/MessageList';
import ErrorPage from '../ErrorPage/ErrorPage';

import {getUser, USER_IDLE, USER_UPDATING, USER_SUCCESS} from '../../redux/user';
import api from '../../util/api';
import classNames from 'classnames';

const NFTPreview = ({id}) => {
    const [message, setMessage] = useState(null);
    const [loading, setLoading] = useState(false);

    if (message === null && !loading) {
        setLoading(true);
        api(`/api/messages/${id}`)
        .then(res => {
            setMessage(res);
            setLoading(false);
        })
        .catch(err => {
            setMessage(null);
            setLoading(false);
        });
    }

    return (
        <div className={style['nft-preview']}>
            <Link to={`/messages/${id}`}>
            {message === null ?
                <Loader /> :
                <MessageList messageData={message} />}
            </Link>
        </div>
    );
};

const ITEMS_PER_PAGE = 5;

const UserPage = () => {
    const {id} = useParams();
    const userState = useSelector(state => state.user);
    const dispatch = useDispatch();
    const getUserCallback = useCallback(() => getUser(dispatch, id), [dispatch, id]);
    const [page, setPage] = useState(0);

    if (
        (userState.status === USER_IDLE) ||
        (userState.id !== id)
    ) {
        getUserCallback(id);
        return <div className={style.loading}><Loader /></div>;
    }

    if (userState.status === USER_UPDATING) {
        return <div className={style.loading}><Loader /></div>;
    }

    if (userState.status !== USER_SUCCESS) {
        return <ErrorPage error={userState.error } />
    }

    const userData = userState.data;
    const {user} = userData;

    const isFirstPage = page === 0;
    const isLastPage = page >= Math.ceil(user.htnftIDs.length / ITEMS_PER_PAGE) - 1;

    const paginator = (
        <div className={style.paginator}>
            <button
                className={classNames(style.prev, style['page-button'])}
                onClick={() => !isFirstPage && setPage(page - 1)}
                disabled={isFirstPage}>←</button>
            <div className={style['page-number']}>{user.htnftIDs.length > 0 ? page + 1 : 0}/{Math.ceil(user.htnftIDs.length / ITEMS_PER_PAGE)}</div>
            <button
                className={classNames(style.next, style['page-button'])}
                onClick={() => !isLastPage && setPage(page + 1)}
                disabled={isLastPage}>→</button>
        </div>
    );

    return (
        <div className={style['user-page']}>
            <div className={style['user-header']}>
                <span className={style.avatar}>
                    <Avatar user={user} size={96} />
                </span>
                <span className={style.username}>{user.name}</span>
                <span className={style.discriminator}>#{user.discriminator}</span>
                <span className={style.balance}>
                    <Diamonds diamonds={user.diamonds} />
                </span>
            </div>
            <h2>This user's HTNFTs: {paginator}</h2>
            <div className={style.nfts}>
                {user.htnftIDs.length > 0 ?
                    user.htnftIDs.slice(page * ITEMS_PER_PAGE, (page + 1) * ITEMS_PER_PAGE).map(id => <NFTPreview id={id} key={id} />) :
                    "This user doesn't own any HTNFTs."}
            </div>
        </div>
    );
};

export default UserPage;
