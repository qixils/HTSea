import api from '../util/api';

export const USER_IDLE = 'USER_IDLE';
export const USER_UPDATING = 'USER_UPDATING';
export const USER_SUCCESS = 'USER_SUCCESS';
export const USER_ERROR = 'USER_ERROR';

function userUpdating(id) {
    return {
        type: USER_UPDATING,
        id
    }
}

function userSuccess(data, id) {
    return {
        type: USER_SUCCESS,
        data,
        id
    }
}

function userError(error, id) {
    return {
        type: USER_ERROR,
        error,
        id
    }
}

export const initialState = {
    status: USER_IDLE,
    id: null
};

const userReducer = (state, action) => {
    switch (action.type) {
        case USER_IDLE:
        case USER_UPDATING: {
            return {
                ...state,
                user: {
                    ...state.user,
                    id: action.id,
                    status: action.type
                }
            }
        }
        case USER_SUCCESS: {
            return {
                ...state,
                user: {
                    ...state.user,
                    id: action.id,
                    error: null,
                    status: action.type,
                    data: action.data
                }
            }
        }
        case USER_ERROR: {
            return {
                ...state,
                user: {
                    ...state.user,
                    id: action.id,
                    status: action.type,
                    error: action.error
                }
            }
        }
        default: return state;
    }
}

const getUser = (dispatch, id) => {
    dispatch(userUpdating(id));
    api(`/api/user/${id}`)
        .then(res => {
            dispatch(userSuccess(res, id));
        })
        .catch(err => {
            dispatch(userError(err, id));
        });
};

export {userReducer, getUser};
