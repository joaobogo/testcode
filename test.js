const axios = require("axios");
const Base64 = {
  _keyStr: "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=",
  encode: function (e) {
    var t = "";
    var n, r, i, s, o, u, a;
    var f = 0;
    e = Base64._utf8_encode(e);
    while (f < e.length) {
      n = e.charCodeAt(f++);
      r = e.charCodeAt(f++);
      i = e.charCodeAt(f++);
      s = n >> 2;
      o = ((n & 3) << 4) | (r >> 4);
      u = ((r & 15) << 2) | (i >> 6);
      a = i & 63;
      if (isNaN(r)) {
        u = a = 64;
      } else if (isNaN(i)) {
        a = 64;
      }
      t =
        t +
        this._keyStr.charAt(s) +
        this._keyStr.charAt(o) +
        this._keyStr.charAt(u) +
        this._keyStr.charAt(a);
    }
    return t;
  },
  decode: function (e) {
    var t = "";
    var n, r, i;
    var s, o, u, a;
    var f = 0;
    e = e.replace(/[^A-Za-z0-9\+\/\=]/g, "");
    while (f < e.length) {
      s = this._keyStr.indexOf(e.charAt(f++));
      o = this._keyStr.indexOf(e.charAt(f++));
      u = this._keyStr.indexOf(e.charAt(f++));
      a = this._keyStr.indexOf(e.charAt(f++));
      n = (s << 2) | (o >> 4);
      r = ((o & 15) << 4) | (u >> 2);
      i = ((u & 3) << 6) | a;
      t = t + String.fromCharCode(n);
      if (u != 64) {
        t = t + String.fromCharCode(r);
      }
      if (a != 64) {
        t = t + String.fromCharCode(i);
      }
    }
    t = Base64._utf8_decode(t);
    return t;
  },
  _utf8_encode: function (e) {
    e = e.replace(/\r\n/g, "\n");
    var t = "";
    for (var n = 0; n < e.length; n++) {
      var r = e.charCodeAt(n);
      if (r < 128) {
        t += String.fromCharCode(r);
      } else if (r > 127 && r < 2048) {
        t += String.fromCharCode((r >> 6) | 192);
        t += String.fromCharCode((r & 63) | 128);
      } else {
        t += String.fromCharCode((r >> 12) | 224);
        t += String.fromCharCode(((r >> 6) & 63) | 128);
        t += String.fromCharCode((r & 63) | 128);
      }
    }
    return t;
  },
  _utf8_decode: function (e) {
    var t = "";
    var n = 0;
    var r = (c1 = c2 = 0);
    while (n < e.length) {
      r = e.charCodeAt(n);
      if (r < 128) {
        t += String.fromCharCode(r);
        n++;
      } else if (r > 191 && r < 224) {
        c2 = e.charCodeAt(n + 1);
        t += String.fromCharCode(((r & 31) << 6) | (c2 & 63));
        n += 2;
      } else {
        c2 = e.charCodeAt(n + 1);
        c3 = e.charCodeAt(n + 2);
        t += String.fromCharCode(
          ((r & 15) << 12) | ((c2 & 63) << 6) | (c3 & 63)
        );
        n += 3;
      }
    }
    return t;
  },
};

const getBase64 = (str) => Base64.encode(str);

const getBlingProducts = async (token) => {
  const config = {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  };
  const apiKey =
    "f0e96ee2e1b11192202fc0a27f61f4cd24d837b014edc17f734fb41c4d63fcc5cf253149";
  const url = `https://bling.com.br/Api/v2/produtos/json?apikey=${apiKey}`;
  const res = await axios.get(url, config);
  return res;
};

const clientId = "17fbe472292ef3083fd1023a4f647ecd11b23963";
const clientSecret =
  "981ab5421d4221f67dd62cafc615f883fccb8acff726d20ac7b35ccf59e6";
const credentials = getBase64(`${clientId}:${clientSecret}`);


let savedToken = undefined
let refreshedToken = undefined
let expiration = 0

const updateSavedData = ({ access_token, refresh_token, expires_in }) => {
  savedToken = access_token;
  refreshedToken = refresh_token;
  expiration = Date.now() + Number(expires_in);
};

const refresh = async (refresh_token) => {
  const url = "https://www.bling.com.br/Api/v3/oauth/token";
  const body = { grant_type: "refresh_token", refresh_token };
  const Authorization = `Basic ${credentials}`;
  const headers = {
    Authorization,
    "Content-Type": "application/x-www-form-urlencoded",
    Accept: "1.0",
  };

  const { data } = await axios.post(url, body, { headers });
  updateSavedData(data);
  return data.access_token;
};

const getToken = async (code) => {
  const url = "https://www.bling.com.br/Api/v3/oauth/token";
  const body = { grant_type: "authorization_code", code };
  const Authorization = `Basic ${credentials}`;
  const headers = {
    Authorization,
    "Content-Type": "application/x-www-form-urlencoded",
    Accept: "1.0",
  };

  const { data } = await axios.post(url, body, { headers });
  updateSavedData(data);
  return data;
};

const getBlingAPI = async () => {
    const isTokenValid = Date.now() < expiration;
    let token = savedToken;
    if (!isTokenValid) {
      token = await refresh(refreshedToken);
    }
    let blingResponse;
    try {
      blingResponse = await getBlingProducts(token);
    } catch (error) {
      blingResponse = error;
    }
  return {
    statusCode: 200,
    headers: {
      "Access-Control-Allow-Headers": "Content-Type",
      "Access-Control-Allow-Origin": "https://easyfert.com.br",
      "Access-Control-Allow-Methods": "OPTIONS,POST,GET",
    },
    body: JSON.stringify(
      {
        token,
        savedData: {
          expiration,
          savedToken,
          refreshedToken
        },
        blingResponse,
      },
      null,
      2
    ),
  };
};

module.exports.bling = async (event) => {
  try {
    const { code, frontend } = event.queryStringParameters;
    if (frontend) return await getBlingAPI();

    const { access_token } = await getToken(code);

    return {
      statusCode: 200,
      headers: {
        "Access-Control-Allow-Headers": "Content-Type",
        "Access-Control-Allow-Origin": "https://easyfert.com.br",
        "Access-Control-Allow-Methods": "OPTIONS,POST,GET",
      },
      body: JSON.stringify(
        {
          access_token,
          // newToken,
        },
        null,
        2
      ),
    };
  } catch (error) {
    return {
      statusCode: 500,
      headers: {
        "Access-Control-Allow-Headers": "Content-Type",
        "Access-Control-Allow-Origin": "https://easyfert.com.br",
        "Access-Control-Allow-Methods": "OPTIONS,POST,GET",
      },
      body: JSON.stringify(
        {
          error: error.message,
          event,
        },
        null,
        2
      ),
    };
  }
};
