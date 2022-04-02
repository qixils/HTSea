import style from './style.module.scss';

const ErrorPage = ({error}) => {
    if (error.status === 404) {
        return (
            <div className={style['not-found']}>
                <div className={style['not-found-header']}>404</div>
                <div>{error.message}</div>
            </div>
        )
    }
    return (
        <div className={style.error}>{error.toString()}</div>
    );
}

export default ErrorPage;
