import style from './style.module.scss';
import diamond from '../../icons/diamond.png';
import logo from '../../icons/logo.png';

import {Component} from 'react';
import {connect} from 'react-redux';
import {Link} from 'react-router-dom';
import classNames from 'classnames';

import Avatar from '../Avatar/Avatar';

import {getSession, SESSION_IDLE, SESSION_SUCCESS} from '../../redux/session';

import loginURL from '../../util/login-url';
class Navbar extends Component {
    render () {
        if (this.props.session.status === SESSION_IDLE) {
            this.props.getSession();
        }

        let user = null;
        if (this.props.session.status === SESSION_SUCCESS && this.props.session.session.logged_in) {
            user = this.props.session.session.user;
        }

        return (
            <div className={style.navbar}>
                <Link to="/" className={classNames(style['nav-link'], style['main-link'])}>
                    <img className={style.logo} src={logo} alt="Logo" width="48" height="48" />HTSea
                </Link>
                <Link to="/activity" className={style['nav-link']}>Activity</Link>
                <Link to="/explore" className={style['nav-link']}>Explore</Link>
                <Link to="/wordle" className={style['nav-link']}>Wordle</Link>
                {user ?
                        <div className={style.user}>
                        <Link to={`/user/${user.snowflake}`}>
                            <div className={style['user-inner']}>
                                <Avatar user={user} size={32} />
                                <span className={style.username}>
                                    {user.name}
                                    <span className={style.discriminator}>#{user.discriminator}</span>
                                </span>
                                <div className={style.diamonds}>
                                    <img className={style['diamond-icon']} src={diamond} width="24" height="26" alt="Diamonds" />
                                    {this.props.diamonds}
                                </div>
                            </div>

                        </Link>
                        </div>
                     :
                    <a className={classNames(style['nav-link'], style.login)} href={loginURL}>Log in via Discord</a>}
            </div>
        );
    }
}

const mapStateToProps = state => {
    return {
        session: state.session,
        diamonds: state.diamonds
    };
}

const mapDispatchToProps = dispatch => ({
    getSession: () => dispatch(getSession)
});

export default connect(mapStateToProps, mapDispatchToProps)(Navbar);
