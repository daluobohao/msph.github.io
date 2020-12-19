---
title: ajax和fetch的异同和封装实现
date: 2019-02-10 20:20:59
tags:
---
# 一、ajax和fetch相同点
1. 两者都是浏览器实现的用于和服务器进行异步通信的接口.
2. 两者都可以实现不刷新页面的情况下局部渲染.

# 二、ajax和fetch的区别
1. ajax是通过浏览器中的XMLHttpRequest(IE5 或者IE6时ActiveXObject('Microsoft.XMLHTTP'))对象实现的。
2. fetch返回一个promise对象
3. fetch跨域时不会带cookie，需要手动指定credentials: 'include'
4. fetch()返回的promise将不会拒绝http的错误状态，即使返回的响应时404或者500

# 三、ajax的封装实现
```
const ajax = (obj) => {
    obj = obj || {};
    obj.type = obj.type.toUpperCase() || "POST";
    obj.url = obj.url || '';
    obj.async = obj.async || true;
    obj.data = obj.data || null;
    obj.success = obj.success || function () {};
    obj.error = obj.error || function () {};
    let xmlHttp = null;
    if(XMLHttpRequest) {
        xmlHttp = new XMLHttpRequest();
    } else {
        xmlHttp = new ActiveXObject('Microsoft.XMLHTTP');
    }
    let pramas = [];
    for(let key in obj.data) {
        pramas.push(key + '=' + obj.data[key]);
    }
    let reqData = pramas.join('&');
    if(obj.type == 'POST') {
        xmlHttp.open(obj.type, obj.url, obj.async);
        xmlHttp.setRequestHeader('Content-Type', 'application/x-wwww-form-urlencoded;charset=utf-8');
        xmlHttp.send(reqData);
    } else if(obj.type == 'GET') {
        xmlHttp.open(obj.type, obj.url+'?'+reqData, obj.async);
        xmlHttp.send();
    }
    xmlHttp.onreadystatechange = () => {
        if(xmlHttp.readyState == 4 && xmlHttp.status == 200) {
            obj.success(xmlHttp.responseText);
        } else {
            obj.error(xmlHttp.responseText);
        }
    }
}
export { ajax }
```

# 四、结合async的fetch封装实现
```
import _ from 'lodash';
import "isomorphic-fetch";
import "es6-promise";
// 封装fetch
class httpFetch {
    // 检查响应状态
    checkStatus(response) {
        if(response.status >= 200 && response.status < 300) { // 响应成功
            return response;
        }
        if(response.status === 301 || response.status === 302) { // 重定向
            window.location = response.headers.get('Location');
        }
        const error = new Error(response.statusText);
        error.data = response;
        throw error;
    }

    // 解析返回的结果
    async parseResult(response) {
        console.log('parseResult response:',response);
        const contentType = response.headers.get('Content-Type');
        if(contentType !== null) {
            if(contentType.indexOf('text') > -1) {
                return await response.text();
            }
            if(contentType.indexOf('form') > -1) {
                return await response.formData();
            }
            if(contentType.indexOf('video') > -1) {
                return await response.blob();
            }
            if(contentType.indexOf('json') > -1) {
                return await response.json();
            }
        }
        return await response.text();
    }

    // 组合判断状态和结果解析
    async processResult(response) {
        let _response = this.checkStatus(response);
        _response = await this.parseResult(_response);
        return _response;
    }

    /**
     * 序列化参数 (get)
     * @param {any} obj
     * @returns
     */
    serialiseObject (obj) {
        const prefix = '?';
        if (obj && Object.keys(obj).length) {
        return prefix + Object.keys(obj).map(key =>
            `${key}=${encodeURIComponent(obj[key])}`
        ).join('&')
        }
        return ''
    }
  
    // 封装fetch的request请求
    async _request(url, init, headers = {}, config = {}) {
        try {
            let options = _.assign(
                {
                    credentials: 'include', // 允许跨域
                },
                init
            );
            options.headers = Object.assign({}, options.headers || {}, headers || {});
            let response = await fetch(url, options);
            response = await this.processResult(response);
            return response;
        } catch(err) {
            throw err;
            return null;
        }
    }

    // get请求
    async get(api, data = {}, headers = {}, config = {}) {
        const query = _.isEmpty(data) ? '' : serialiseObject(data);
        return await this._request(`${api}${query}`, headers, {}, config);
    }

    // post请求
    async post(api, data = {}, headers = {}, config = {}) {
        const _headers = {
            'Content-Type': 'application/x-wwww-form-urlencoded',
            ...headers,
        };
        let formBody = null;
        if(_headers['Content-Type'] && _headers['Content-Type'].indexOf('application/x-www-form-urlencoded') > -1) {
            formBody = new URLSearchParams();
            for (let key in data) {
                if(typeof(data[key] === 'object')) {
                    formBody.append(key, JSON.stringify(data[key]));
                } else {
                    formBody.append(key, data[key]);
                }
            }
        }
        return await this._request(
            api,
            {
                method: 'POST',
                headers: _headers,
                body: formBody,
            },
            {},
            config,
        )
    }
}
let http = new httpFetch();
export {http}
```