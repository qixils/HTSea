import style from './style.module.scss';

import {useState} from 'react';
import {Link} from 'react-router-dom';

import api from '../../util/api';
import {BlueButton} from '../Sea/SeaButton';

const RecentTransactions = () => {
    const [transactionBatches, setTransactionBatches] = useState(null);
    const [loading, setLoading] = useState(false);
    const [moreRemaining, setMoreRemaining] = useState(true);

    if (transactionBatches === null && !loading) {
        setLoading(true);
        api(`/api/recent_transactions`)
        .then(res => {
            setTransactionBatches([res]);
            setLoading(false);
        })
        .catch(err => {
            setTransactionBatches(null);
            setLoading(false);
        });
    }

    const transactions = [];
    const users = new Map();
    if (transactionBatches !== null) {
        for (const batch of transactionBatches) {
            transactions.push(...batch.transactions);
            for (const user of batch.users) {
                users.set(user.id, user);
            }
        }
    }

    console.log(transactions, users);

    const inlineUser = user => ( user ?
        <Link to={`/users/${user.id}`}>
            <span className={style.user}>
                <img className={style.avatar} width="16" height="16" src={user.avatar} alt="Avatar"/>
                <span className={style.username}> {user.name}</span>
                <span className={style.discriminator}>#{user.discriminator.toString().padStart(4, '0')}</span>
            </span>
        </Link> : user
    );

    return (
        <div className={style['recent-transactions']}>
            <h1>Recent Activity</h1>
            <div className={style.feed}>
                {transactions.map(tx => {
                    console.log(tx.buyer, tx.seller);
                    return (
                        <div className={style.transaction}>
                            {inlineUser(users.get(tx.buyer))}
                            {tx.seller ? (
                                <span> bought HTNFT <Link to={`/messages/${tx.messageID}`}>#{tx.messageID}</Link> from {inlineUser(users.get(tx.seller))}</span>
                            ) : (
                                <span> minted HTNFT <Link to={`/messages/${tx.messageID}`}>#{tx.messageID}</Link></span>
                            )}
                        </div>
                    )
                })}
                {moreRemaining && !loading ? 
                    <BlueButton onClick={() => {
                        api(`/api/recent_transactions?before=${transactions[transactions.length - 1].timestamp}`)
                        .then(res => {
                            setTransactionBatches([...transactionBatches, res]);
                            if (res.transactions.length === 0) setMoreRemaining(false);
                            setLoading(false);
                        })
                        .catch(err => {
                            setLoading(false);
                        });
                    }}>Load more</BlueButton>
                : null}
            </div>
        </div>
    )
};

export default RecentTransactions;
