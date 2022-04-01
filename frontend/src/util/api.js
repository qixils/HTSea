class APIError extends Error {
    constructor (message, type) {
        super(message);
        this.type = type;
        this.name = 'APIError';
    }

    toString () {
        return `${this.name}: ${this.type}` + (this.message ? ` (${this.message})` : '');
    }
}

const api = (route, opts = {}) => {
    const {params, ...otherOpts} = opts;
    let url = process.env.REACT_APP_API_URL + route;
    if (params) {
        url += '?';
        url += new URLSearchParams(params).toString();
    }
    return fetch(
        url,
        // include credentials by default
        Object.assign({credentials: 'include'}, otherOpts)
    )
    .then(res => res.json())
    .then(res => {
        if (res.success === false || res.error) {
            throw new APIError(res.comment || '', res.error);
        }
        return res;
    });
};

export default api;