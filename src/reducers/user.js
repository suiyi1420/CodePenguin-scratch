const SET_USER = 'scratch-gui/user/set';

const initialState = {
    userInfo: null,
};

const reducer = function (state, action) {
    if (typeof state === 'undefined') state = initialState;
    // console.log('action', action.payload);
    switch (action.type) {
        case SET_USER:
            return {
                ...state,
                ...action.payload,
            }; // intended to show standard and inline alerts, but not extensions

        default:
            return state;
    }
};
const setUserInfo = function (user) {
    console.log('user1', user);
    return {
        type: SET_USER,
        payload: { userInfo: user },
    };
};

const getUserInfo = dispatch => {
    const param = new URLSearchParams(window.location.search);
    // eslint-disable-next-line camelcase
    const access = param.get('access');
    const token = 'Bearer ' + access;
    fetch(`static/config.json`)
        .then(resp => resp.json())
        .then(res => {
            const opt = {
                headers: { Authorization: token },
                method: 'GET',
            };
            fetch(res.apiBaseURL + 'getInfo', opt)
                .then(resp1 => resp1.json())
                .then(resp2 => {
                    if (resp2.code == '200' || resp2.code == 200) {
                        dispatch(setUserInfo(resp2.user));
                    } else {
                        alert('请先登录！');
                        window.location.href = res.userWeb;
                    }
                });
        });
};

export { reducer as default, initialState as userInitialState, getUserInfo };
