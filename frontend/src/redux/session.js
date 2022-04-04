import api from '../util/api';

export const SESSION_IDLE = 'SESSION_IDLE';
export const SESSION_PENDING = 'SESSION_PENDING';
export const SESSION_SUCCESS = 'SESSION_SUCCESS';
export const SESSION_ERROR = 'SESSION_ERROR';

function sessionPending() {
    return {
        type: SESSION_PENDING
    }
}

function sessionSuccess(session) {
    return {
        type: SESSION_SUCCESS,
        session
    }
}

function sessionError(error) {
    return {
        type: SESSION_ERROR,
        error
    }
}

export const initialState = {
    status: SESSION_IDLE
};

const sessionReducer = (state, action) => {
    switch (action.type) {
        case SESSION_IDLE:
        case SESSION_PENDING: {
            return {
                ...state,
                session: {
                    status: action.type
                }
            }
        }
        case SESSION_SUCCESS: {
            return {
                ...state,
                session: {
                    status: action.type,
                    session: action.session
                },
                diamonds: action.session.user?.diamonds
            }
        }
        case SESSION_ERROR: {
            return {
                ...state,
                session: {
                    status: action.type,
                    error: action.error
                }
            }
        }
        default: return state;
    }
}

const getSession = dispatch => {
    dispatch(sessionPending());
    api('/api/users/session')
        .then(res => {
            dispatch(sessionSuccess(res));
        })
        .catch(err => {
            dispatch(sessionError(err));
        })
};

export {getSession, sessionReducer};
