import style from './style.module.scss';

import {useCallback} from 'react';
import {useSelector, useDispatch} from 'react-redux';

import {setError} from '../../redux/error';

const ErrorBanner = () => {
    const error = useSelector(state => state.error);
    const dispatch = useDispatch();
    const closeError = useCallback(() => {
        dispatch(setError(null));
    }, [dispatch]);
    if (!error) return null;

    return (
        <div className={style['error-banner-container']}>
            <div className={style['error-banner']}>{error.toString()} <span className={style.close} onClick={closeError}>✖</span></div>
        </div>
    )
}

export default ErrorBanner;
