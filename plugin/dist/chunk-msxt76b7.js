// node_modules/preact/dist/preact.module.js
var n;
var l;
var u;
var t;
var i;
var r;
var o;
var e;
var f;
var c;
var a;
var s;
var h;
var p;
var v;
var y;
var d = {};
var w = [];
var _ = /acit|ex(?:s|g|n|p|$)|rph|grid|ows|mnc|ntw|ine[ch]|zoo|^ord|itera/i;
var g = Array.isArray;
function m(n, l) {
  for (var u in l)
    n[u] = l[u];
  return n;
}
function b(n) {
  n && n.parentNode && n.parentNode.removeChild(n);
}
function k(l, u, t) {
  var i, r, o, e = {};
  for (o in u)
    o == "key" ? i = u[o] : o == "ref" ? r = u[o] : e[o] = u[o];
  if (arguments.length > 2 && (e.children = arguments.length > 3 ? n.call(arguments, 2) : t), typeof l == "function" && l.defaultProps != null)
    for (o in l.defaultProps)
      e[o] === undefined && (e[o] = l.defaultProps[o]);
  return x(l, e, i, r, null);
}
function x(n, t, i, r, o) {
  var e = { type: n, props: t, key: i, ref: r, __k: null, __: null, __b: 0, __e: null, __c: null, constructor: undefined, __v: o == null ? ++u : o, __i: -1, __u: 0 };
  return o == null && l.vnode != null && l.vnode(e), e;
}
function S(n) {
  return n.children;
}
function C(n, l) {
  this.props = n, this.context = l;
}
function $(n, l) {
  if (l == null)
    return n.__ ? $(n.__, n.__i + 1) : null;
  for (var u;l < n.__k.length; l++)
    if ((u = n.__k[l]) != null && u.__e != null)
      return u.__e;
  return typeof n.type == "function" ? $(n) : null;
}
function I(n) {
  if (n.__P && n.__d) {
    var u = n.__v, t = u.__e, i = [], r = [], o = m({}, u);
    o.__v = u.__v + 1, l.vnode && l.vnode(o), q(n.__P, o, u, n.__n, n.__P.namespaceURI, 32 & u.__u ? [t] : null, i, t == null ? $(u) : t, !!(32 & u.__u), r), o.__v = u.__v, o.__.__k[o.__i] = o, D(i, o, r), u.__e = u.__ = null, o.__e != t && P(o);
  }
}
function P(n) {
  if ((n = n.__) != null && n.__c != null)
    return n.__e = n.__c.base = null, n.__k.some(function(l) {
      if (l != null && l.__e != null)
        return n.__e = n.__c.base = l.__e;
    }), P(n);
}
function A(n) {
  (!n.__d && (n.__d = true) && i.push(n) && !H.__r++ || r != l.debounceRendering) && ((r = l.debounceRendering) || o)(H);
}
function H() {
  try {
    for (var n, l = 1;i.length; )
      i.length > l && i.sort(e), n = i.shift(), l = i.length, I(n);
  } finally {
    i.length = H.__r = 0;
  }
}
function L(n, l, u, t, i, r, o, e, f, c, a) {
  var s, h, p, v, y, _, g = t && t.__k || w, m = l.length;
  for (f = T(u, l, g, f, m), s = 0;s < m; s++)
    (p = u.__k[s]) != null && (h = p.__i != -1 && g[p.__i] || d, p.__i = s, _ = q(n, p, h, i, r, o, e, f, c, a), v = p.__e, p.ref && h.ref != p.ref && (h.ref && J(h.ref, null, p), a.push(p.ref, p.__c || v, p)), y == null && v != null && (y = v), 4 & p.__u ? (f = j(p, f, n), h.__e && (h.__e = null)) : typeof p.type == "function" && _ !== undefined ? f = _ : v && (f = v.nextSibling), p.__u &= -7);
  return u.__e = y, f;
}
function T(n, l, u, t, i) {
  var r, o, e, f, c, a = u.length, s = a, h = 0;
  for (n.__k = new Array(i), r = 0;r < i; r++)
    (o = l[r]) != null && typeof o != "boolean" && typeof o != "function" ? (typeof o == "string" || typeof o == "number" || typeof o == "bigint" || o.constructor == String ? o = n.__k[r] = x(null, o, null, null, null) : g(o) ? o = n.__k[r] = x(S, { children: o }, null, null, null) : o.constructor === undefined && o.__b > 0 ? o = n.__k[r] = x(o.type, o.props, o.key, o.ref ? o.ref : null, o.__v) : n.__k[r] = o, f = r + h, o.__ = n, o.__b = n.__b + 1, e = null, (c = o.__i = O(o, u, f, s)) != -1 && (s--, (e = u[c]) && (e.__u |= 2)), e == null || e.__v == null ? (c == -1 && (i > a ? h-- : i < a && h++), typeof o.type != "function" && (o.__u |= 4)) : c != f && (c == f - 1 ? h-- : c == f + 1 ? h++ : (c > f ? h-- : h++, o.__u |= 4))) : n.__k[r] = null;
  if (s)
    for (r = 0;r < a; r++)
      (e = u[r]) != null && (2 & e.__u) == 0 && (e.__e == t && (t = $(e)), K(e, e));
  return t;
}
function j(n, l, u) {
  var t, i;
  if (typeof n.type == "function") {
    for (t = n.__k, i = 0;t && i < t.length; i++)
      t[i] && (t[i].__ = n, l = j(t[i], l, u));
    return l;
  }
  n.__e != l && (l && n.type && !l.parentNode && (l = $(n)), l = u.insertBefore(n.__e, l || null));
  do {
    l = l && l.nextSibling;
  } while (l != null && l.nodeType == 8);
  return l;
}
function O(n, l, u, t) {
  var i, r, o, { key: e, type: f } = n, c = l[u], a = c != null && (2 & c.__u) == 0;
  if (c === null && e == null || a && e == c.key && f == c.type)
    return u;
  if (t > (a ? 1 : 0)) {
    for (i = u - 1, r = u + 1;i >= 0 || r < l.length; )
      if ((c = l[o = i >= 0 ? i-- : r++]) != null && (2 & c.__u) == 0 && e == c.key && f == c.type)
        return o;
  }
  return -1;
}
function z(n, l, u) {
  l[0] == "-" ? n.setProperty(l, u == null ? "" : u) : n[l] = u == null ? "" : typeof u != "number" || _.test(l) ? u : u + "px";
}
function N(n, l, u, t, i) {
  var r, o;
  n:
    if (l == "style")
      if (typeof u == "string")
        n.style.cssText = u;
      else {
        if (typeof t == "string" && (n.style.cssText = t = ""), t)
          for (l in t)
            u && l in u || z(n.style, l, "");
        if (u)
          for (l in u)
            t && u[l] == t[l] || z(n.style, l, u[l]);
      }
    else if (l[0] == "o" && l[1] == "n")
      r = l != (l = l.replace(s, "$1")), o = l.toLowerCase(), l = o in n || l == "onFocusOut" || l == "onFocusIn" ? o.slice(2) : l.slice(2), n.l || (n.l = {}), n.l[l + r] = u, u ? t ? u[a] = t[a] : (u[a] = h, n.addEventListener(l, r ? v : p, r)) : n.removeEventListener(l, r ? v : p, r);
    else {
      if (i == "http://www.w3.org/2000/svg")
        l = l.replace(/xlink(H|:h)/, "h").replace(/sName$/, "s");
      else if (l != "width" && l != "height" && l != "href" && l != "list" && l != "form" && l != "tabIndex" && l != "download" && l != "rowSpan" && l != "colSpan" && l != "role" && l != "popover" && l in n)
        try {
          n[l] = u == null ? "" : u;
          break n;
        } catch (n) {}
      typeof u == "function" || (u == null || u === false && l[4] != "-" ? n.removeAttribute(l) : n.setAttribute(l, l == "popover" && u == 1 ? "" : u));
    }
}
function V(n) {
  return function(u) {
    if (this.l) {
      var t = this.l[u.type + n];
      if (u[c] == null)
        u[c] = h++;
      else if (u[c] < t[a])
        return;
      return t(l.event ? l.event(u) : u);
    }
  };
}
function q(n, u, t, i, r, o, e, f, c, a) {
  var s, h, p, v, y, d, _, k, x, M, I, P, A, H, T, j, F = u.type;
  if (u.constructor !== undefined)
    return null;
  128 & t.__u && (c = !!(32 & t.__u), o = [f = u.__e = t.__e]), (s = l.__b) && s(u);
  n:
    if (typeof F == "function") {
      h = e.length;
      try {
        if (x = u.props, M = F.prototype && F.prototype.render, I = (s = F.contextType) && i[s.__c], P = s ? I ? I.props.value : s.__ : i, t.__c ? k = (p = u.__c = t.__c).__ = p.__E : (M ? u.__c = p = new F(x, P) : (u.__c = p = new C(x, P), p.constructor = F, p.render = Q), I && I.sub(p), p.state || (p.state = {}), p.__n = i, v = p.__d = true, p.__h = [], p._sb = []), M && p.__s == null && (p.__s = p.state), M && F.getDerivedStateFromProps != null && (p.__s == p.state && (p.__s = m({}, p.__s)), m(p.__s, F.getDerivedStateFromProps(x, p.__s))), y = p.props, d = p.state, p.__v = u, v)
          M && F.getDerivedStateFromProps == null && p.componentWillMount != null && p.componentWillMount(), M && p.componentDidMount != null && p.__h.push(p.componentDidMount);
        else {
          if (M && F.getDerivedStateFromProps == null && x !== y && p.componentWillReceiveProps != null && p.componentWillReceiveProps(x, P), u.__v == t.__v || !p.__e && p.shouldComponentUpdate != null && p.shouldComponentUpdate(x, p.__s, P) === false) {
            u.__v != t.__v && (p.props = x, p.state = p.__s, p.__d = false), u.__e = t.__e, u.__k = t.__k, u.__k.some(function(n) {
              n && (n.__ = u);
            }), w.push.apply(p.__h, p._sb), p._sb = [], p.__h.length && e.push(p), f = $(t);
            break n;
          }
          p.componentWillUpdate != null && p.componentWillUpdate(x, p.__s, P), M && p.componentDidUpdate != null && p.__h.push(function() {
            p.componentDidUpdate(y, d, _);
          });
        }
        if (p.context = P, p.props = x, p.__P = n, p.__e = false, A = l.__r, H = 0, M)
          p.state = p.__s, p.__d = false, A && A(u), s = p.render(p.props, p.state, p.context), w.push.apply(p.__h, p._sb), p._sb = [];
        else
          do {
            p.__d = false, A && A(u), s = p.render(p.props, p.state, p.context), p.state = p.__s;
          } while (p.__d && ++H < 25);
        p.state = p.__s, p.getChildContext != null && (i = m(m({}, i), p.getChildContext())), M && !v && p.getSnapshotBeforeUpdate != null && (_ = p.getSnapshotBeforeUpdate(y, d)), T = s != null && s.type === S && s.key == null ? E(s.props.children) : s, f = L(n, g(T) ? T : [T], u, t, i, r, o, e, f, c, a), p.base = u.__e, u.__u &= -161, p.__h.length && e.push(p), k && (p.__E = p.__ = null);
      } catch (n) {
        if (e.length = h, u.__v = null, c || o != null) {
          if (n.then) {
            for (u.__u |= c ? 160 : 128;f && f.nodeType == 8 && f.nextSibling; )
              f = f.nextSibling;
            o != null && (o[o.indexOf(f)] = null), u.__e = f;
          } else if (o != null)
            for (j = o.length;j--; )
              b(o[j]);
        } else
          u.__e = t.__e;
        u.__k == null && (u.__k = t.__k || []), n.then || B(u), l.__e(n, u, t);
      }
    } else
      o == null && u.__v == t.__v ? (u.__k = t.__k, u.__e = t.__e) : f = u.__e = G(t.__e, u, t, i, r, o, e, c, a);
  return (s = l.diffed) && s(u), 128 & u.__u ? undefined : f;
}
function B(n) {
  n && (n.__c && (n.__c.__e = true), n.__k && n.__k.some(B));
}
function D(n, u, t) {
  for (var i = 0;i < t.length; i++)
    J(t[i], t[++i], t[++i]);
  l.__c && l.__c(u, n), n.some(function(u) {
    try {
      n = u.__h, u.__h = [], n.some(function(n) {
        n.call(u);
      });
    } catch (n) {
      l.__e(n, u.__v);
    }
  });
}
function E(n) {
  return typeof n != "object" || n == null || n.__b > 0 ? n : g(n) ? n.map(E) : n.constructor !== undefined ? null : m({}, n);
}
function G(u, t, i, r, o, e, f, c, a) {
  var s, h, p, v, y, w, _, m = i.props || d, { props: k, type: x } = t;
  if (x == "svg" ? o = "http://www.w3.org/2000/svg" : x == "math" ? o = "http://www.w3.org/1998/Math/MathML" : o || (o = "http://www.w3.org/1999/xhtml"), e != null) {
    for (s = 0;s < e.length; s++)
      if ((y = e[s]) && "setAttribute" in y == !!x && (x ? y.localName == x : y.nodeType == 3)) {
        u = y, e[s] = null;
        break;
      }
  }
  if (u == null) {
    if (x == null)
      return document.createTextNode(k);
    u = document.createElementNS(o, x, k.is && k), c && (l.__m && l.__m(t, e), c = false), e = null;
  }
  if (x == null)
    m === k || c && u.data == k || (u.data = k);
  else {
    if (e = x == "textarea" && k.defaultValue != null ? null : e && n.call(u.childNodes), !c && e != null)
      for (m = {}, s = 0;s < u.attributes.length; s++)
        m[(y = u.attributes[s]).name] = y.value;
    for (s in m)
      y = m[s], s == "dangerouslySetInnerHTML" ? p = y : s == "children" || (s in k) || s == "value" && ("defaultValue" in k) || s == "checked" && ("defaultChecked" in k) || N(u, s, null, y, o);
    for (s in k)
      y = k[s], s == "children" ? v = y : s == "dangerouslySetInnerHTML" ? h = y : s == "value" ? w = y : s == "checked" ? _ = y : c && typeof y != "function" || m[s] === y || N(u, s, y, m[s], o);
    if (h)
      c || p && (h.__html == p.__html || h.__html == u.innerHTML) || (u.innerHTML = h.__html), t.__k = [];
    else if (p && (u.innerHTML = ""), L(t.type == "template" ? u.content : u, g(v) ? v : [v], t, i, r, x == "foreignObject" ? "http://www.w3.org/1999/xhtml" : o, e, f, e ? e[0] : i.__k && $(i, 0), c, a), e != null)
      for (s = e.length;s--; )
        b(e[s]);
    c && x != "textarea" || (s = "value", x == "progress" && w == null ? u.removeAttribute("value") : w != null && (w !== u[s] || x == "progress" && !w || x == "option" && w != m[s]) && N(u, s, w, m[s], o), s = "checked", _ != null && _ != u[s] && N(u, s, _, m[s], o));
  }
  return u;
}
function J(n, u, t) {
  try {
    if (typeof n == "function") {
      var i = typeof n.__u == "function";
      i && n.__u(), i && u == null || (n.__u = n(u));
    } else
      n.current = u;
  } catch (n) {
    l.__e(n, t);
  }
}
function K(n, u, t) {
  var i, r;
  if (l.unmount && l.unmount(n), (i = n.ref) && (i.current && i.current != n.__e || J(i, null, u)), (i = n.__c) != null) {
    if (i.componentWillUnmount)
      try {
        i.componentWillUnmount();
      } catch (n) {
        l.__e(n, u);
      }
    i.base = i.__P = i.__n = null;
  }
  if (i = n.__k)
    for (r = 0;r < i.length; r++)
      i[r] && K(i[r], u, t || typeof n.type != "function");
  t || b(n.__e), n.__c = n.__ = n.__e = undefined;
}
function Q(n, l, u) {
  return this.constructor(n, u);
}
function R(u, t, i) {
  var r, o, e, f;
  t == document && (t = document.documentElement), l.__ && l.__(u, t), o = (r = typeof i == "function") ? null : i && i.__k || t.__k, e = [], f = [], q(t, u = (!r && i || t).__k = k(S, null, [u]), o || d, d, t.namespaceURI, !r && i ? [i] : o ? null : t.firstChild ? n.call(t.childNodes) : null, e, !r && i ? i : o ? o.__e : t.firstChild, r, f), D(e, u, f), u.props.children = null;
}
n = w.slice, l = { __e: function(n, l, u, t) {
  for (var i, r, o;l = l.__; )
    if ((i = l.__c) && !i.__)
      try {
        if ((r = i.constructor) && r.getDerivedStateFromError != null && (i.setState(r.getDerivedStateFromError(n)), o = i.__d), i.componentDidCatch != null && (i.componentDidCatch(n, t || {}), o = i.__d), o)
          return i.__E = i;
      } catch (l) {
        n = l;
      }
  throw n;
} }, u = 0, t = function(n) {
  return n != null && n.constructor === undefined;
}, C.prototype.setState = function(n, l) {
  var u;
  u = this.__s != null && this.__s != this.state ? this.__s : this.__s = m({}, this.state), typeof n == "function" && (n = n(m({}, u), this.props)), n && m(u, n), n != null && this.__v && (l && this._sb.push(l), A(this));
}, C.prototype.forceUpdate = function(n) {
  this.__v && (this.__e = true, n && this.__h.push(n), A(this));
}, C.prototype.render = S, i = [], o = typeof Promise == "function" ? Promise.prototype.then.bind(Promise.resolve()) : setTimeout, e = function(n, l) {
  return n.__v.__b - l.__v.__b;
}, H.__r = 0, f = Math.random().toString(8), c = "__d" + f, a = "__a" + f, s = /(PointerCapture)$|Capture$/i, h = 0, p = V(false), v = V(true), y = 0;

// node_modules/preact/hooks/dist/hooks.module.js
var t2;
var r2;
var u2;
var i2;
var o2 = 0;
var f2 = [];
var c2 = l;
var e2 = c2.__b;
var a2 = c2.__r;
var v2 = c2.diffed;
var l2 = c2.__c;
var m2 = c2.unmount;
var p2 = c2.__;
function s2(n, t) {
  c2.__h && c2.__h(r2, n, o2 || t), o2 = 0;
  var u = r2.__H || (r2.__H = { __: [], __h: [] });
  return n >= u.__.length && u.__.push({}), u.__[n];
}
function d2(n) {
  return o2 = 1, y2(D2, n);
}
function y2(n, u, i) {
  var o = s2(t2++, 2);
  if (o.t = n, !o.__c && (o.__ = [i ? i(u) : D2(undefined, u), function(n) {
    var t = o.__N ? o.__N[0] : o.__[0], r = o.t(t, n);
    t !== r && (o.__N = [r, o.__[1]], o.__c.setState({}));
  }], o.__c = r2, !r2.__f)) {
    var f = function(n, t, r) {
      if (!o.__c.__H)
        return true;
      var u = false, i = o.__c.props !== n;
      if (o.__c.__H.__.some(function(n) {
        if (n.__N) {
          u = true;
          var t = n.__[0];
          n.__ = n.__N, n.__N = undefined, t !== n.__[0] && (i = true);
        }
      }), c) {
        var f = c.call(this, n, t, r);
        return u ? f || i : f;
      }
      return !u || i;
    };
    r2.__f = true;
    var c = r2.shouldComponentUpdate, e = r2.componentWillUpdate;
    r2.componentWillUpdate = function(n, t, r) {
      if (this.__e) {
        var u = c;
        c = undefined, f(n, t, r), c = u;
      }
      e && e.call(this, n, t, r);
    }, r2.shouldComponentUpdate = f;
  }
  return o.__N || o.__;
}
function h2(n, u) {
  var i = s2(t2++, 3);
  !c2.__s && C2(i.__H, u) && (i.__ = n, i.u = u, r2.__H.__h.push(i));
}
function A2(n) {
  return o2 = 5, T2(function() {
    return { current: n };
  }, []);
}
function T2(n, r) {
  var u = s2(t2++, 7);
  return C2(u.__H, r) && (u.__ = n(), u.__H = r, u.__h = n), u.__;
}
function q2(n, t) {
  return o2 = 8, T2(function() {
    return n;
  }, t);
}
function j2() {
  for (var n;n = f2.shift(); ) {
    var t = n.__H;
    if (n.__P && t)
      try {
        t.__h.some(z2), t.__h.some(B2), t.__h = [];
      } catch (r) {
        t.__h = [], c2.__e(r, n.__v);
      }
  }
}
c2.__b = function(n) {
  r2 = null, e2 && e2(n);
}, c2.__ = function(n, t) {
  n && t.__k && t.__k.__m && (n.__m = t.__k.__m), p2 && p2(n, t);
}, c2.__r = function(n) {
  a2 && a2(n), t2 = 0;
  var i = (r2 = n.__c).__H;
  i && (u2 === r2 ? (i.__h = [], r2.__h = [], i.__.some(function(n) {
    n.__N && (n.__ = n.__N), n.u = n.__N = undefined;
  })) : (i.__h.some(z2), i.__h.some(B2), i.__h = [], t2 = 0)), u2 = r2;
}, c2.diffed = function(n) {
  v2 && v2(n);
  var t = n.__c;
  t && t.__H && (t.__H.__h.length && (f2.push(t) !== 1 && i2 === c2.requestAnimationFrame || ((i2 = c2.requestAnimationFrame) || w2)(j2)), t.__H.__.some(function(n) {
    n.u && (n.__H = n.u, n.u = undefined);
  })), u2 = r2 = null;
}, c2.__c = function(n, t) {
  t.some(function(n) {
    try {
      n.__h.some(z2), n.__h = n.__h.filter(function(n) {
        return !n.__ || B2(n);
      });
    } catch (r) {
      t.some(function(n) {
        n.__h && (n.__h = []);
      }), t = [], c2.__e(r, n.__v);
    }
  }), l2 && l2(n, t);
}, c2.unmount = function(n) {
  m2 && m2(n);
  var t, r = n.__c;
  r && r.__H && (r.__H.__.some(function(n) {
    try {
      z2(n);
    } catch (n) {
      t = n;
    }
  }), r.__H = undefined, t && c2.__e(t, r.__v));
};
var k2 = typeof requestAnimationFrame == "function";
function w2(n) {
  var t, r = function() {
    clearTimeout(u), k2 && cancelAnimationFrame(t), setTimeout(n);
  }, u = setTimeout(r, 35);
  k2 && (t = requestAnimationFrame(r));
}
function z2(n) {
  var t = r2, u = n.__c;
  typeof u == "function" && (n.__c = undefined, u()), r2 = t;
}
function B2(n) {
  var t = r2;
  n.__c = n.__(), r2 = t;
}
function C2(n, t) {
  return !n || n.length !== t.length || t.some(function(t, r) {
    return t !== n[r];
  });
}
function D2(n, t) {
  return typeof t == "function" ? t(n) : t;
}
// node_modules/preact/jsx-runtime/dist/jsxRuntime.module.js
var f3 = 0;
function u3(e, t, n, o, i, u) {
  t || (t = {});
  var a, c, p = t;
  if ("ref" in p)
    for (c in p = {}, t)
      c == "ref" ? a = t[c] : p[c] = t[c];
  var l2 = { type: e, props: p, key: n, ref: a, __k: null, __: null, __b: 0, __e: null, __c: null, constructor: undefined, __v: --f3, __i: -1, __u: 0, __source: i, __self: u };
  if (typeof e == "function" && (a = e.defaultProps))
    for (c in a)
      p[c] === undefined && (p[c] = a[c]);
  return l.vnode && l.vnode(l2), l2;
}

// server/icons.tsx
function Sprite() {
  return /* @__PURE__ */ u3("svg", {
    width: "0",
    height: "0",
    style: { position: "absolute" },
    "aria-hidden": "true",
    dangerouslySetInnerHTML: {
      __html: `
  <symbol id="i-history" viewBox="0 0 24 24"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" /><path d="M3 3v5h5" /><path d="M12 7v5l4 2" /></symbol>
  <symbol id="i-circle-help" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" /><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" /><path d="M12 17h.01" /></symbol>
  <symbol id="i-message-circle-question" viewBox="0 0 24 24"><path d="M7.9 20A9 9 0 1 0 4 16.1L2 22Z" /><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" /><path d="M12 17h.01" /></symbol>
  <symbol id="i-plus" viewBox="0 0 24 24"><path d="M12 5v14M5 12h14" /></symbol>
  <symbol id="i-minus" viewBox="0 0 24 24"><path d="M5 12h14" /></symbol>
  <symbol id="i-close" viewBox="0 0 24 24"><path d="m6 6 12 12M6 18 18 6" /></symbol>
  <symbol id="i-chevron-up" viewBox="0 0 24 24"><path d="m18 15-6-6-6 6" /></symbol>
  <symbol id="i-chevron-down" viewBox="0 0 24 24"><path d="m6 9 6 6 6-6" /></symbol>
  <symbol id="i-arrow-right" viewBox="0 0 24 24"><path d="M4 12h16m-6-6 6 6-6 6" /></symbol>
  <symbol id="i-refresh" viewBox="0 0 24 24"><path d="M20 7v5h-5M4 17v-5h5" /><path d="M6.1 6a8 8 0 0 1 13.4 3M4.5 15a8 8 0 0 0 13.4 3" /></symbol>
  <symbol id="i-layers" viewBox="0 0 24 24"><path d="m12 3 10 5-10 5L2 8l10-5ZM2 12l10 5 10-5M2 16l10 5 10-5" /></symbol>
  <symbol id="i-folder" viewBox="0 0 24 24"><path d="M3 7V5a2 2 0 0 1 2-2h5l2 3h7a2 2 0 0 1 2 2v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7Z" /></symbol>
  <symbol id="i-copy" viewBox="0 0 24 24"><rect x="8" y="8" width="12" height="13" rx="2"/><path d="M16 8V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h3"/></symbol>
  <symbol id="i-file-text" viewBox="0 0 24 24"><path d="M6 22a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h8a2.4 2.4 0 0 1 1.704.706l3.588 3.588A2.4 2.4 0 0 1 20 8v12a2 2 0 0 1-2 2z" /> <path d="M14 2v5a1 1 0 0 0 1 1h5" /> <path d="M10 9H8" /> <path d="M16 13H8" /> <path d="M16 17H8" /></symbol>
  <symbol id="i-terminal" viewBox="0 0 24 24"><path d="M12 19h8" /> <path d="m4 17 6-6-6-6" /></symbol>
  <symbol id="i-eye" viewBox="0 0 24 24"><path d="M2.062 12.348a1 1 0 0 1 0-.696 10.75 10.75 0 0 1 19.876 0 1 1 0 0 1 0 .696 10.75 10.75 0 0 1-19.876 0" /> <circle cx="12" cy="12" r="3" /></symbol>
  <symbol id="i-pencil" viewBox="0 0 24 24"><path d="M21.174 6.812a1 1 0 0 0-3.986-3.987L3.842 16.174a2 2 0 0 0-.5.83l-1.321 4.352a.5.5 0 0 0 .623.622l4.353-1.32a2 2 0 0 0 .83-.497z" /> <path d="m15 5 4 4" /></symbol>
  <symbol id="i-circle-check" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" /> <path d="m16 9-5.5 5.5L8 12" /></symbol>
  <symbol id="i-circle-x" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" /> <path d="m15 9-6 6" /> <path d="m9 9 6 6" /></symbol>
  <symbol id="i-search" viewBox="0 0 24 24"><path d="m21 21-4.34-4.34" /> <circle cx="11" cy="11" r="8" /></symbol>
  <symbol id="i-target" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" /><circle cx="12" cy="12" r="6" /><circle cx="12" cy="12" r="2" /></symbol>
  <symbol id="i-clock" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" /> <path d="M12 6v6l4 2" /></symbol>
  <symbol id="i-git-commit-horizontal" viewBox="0 0 24 24"><circle cx="12" cy="12" r="3" /> <line x1="3" x2="9" y1="12" y2="12" /> <line x1="15" x2="21" y1="12" y2="12" /></symbol>
  <symbol id="i-external-link" viewBox="0 0 24 24"><path d="M15 3h6v6" /> <path d="M10 14 21 3" /> <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" /></symbol>
  <symbol id="i-plug" viewBox="0 0 24 24"><path d="M12 22v-5" /><path d="M9 8V2" /><path d="M15 8V2" /><path d="M18 8v5a4 4 0 0 1-4 4h-4a4 4 0 0 1-4-4V8Z" /></symbol>
  <symbol id="i-wrench" viewBox="0 0 24 24"><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" /></symbol>
  <symbol id="i-cpu" viewBox="0 0 24 24"><path d="M12 20v2" /><path d="M12 2v2" /><path d="M17 20v2" /><path d="M17 2v2" /><path d="M2 12h2" /><path d="M2 17h2" /><path d="M2 7h2" /><path d="M20 12h2" /><path d="M20 17h2" /><path d="M20 7h2" /><path d="M7 20v2" /><path d="M7 2v2" /><rect x="4" y="4" width="16" height="16" rx="2" /><rect x="8" y="8" width="8" height="8" rx="1" /></symbol>
  <symbol id="i-chart-column" viewBox="0 0 24 24"><path d="M3 3v16a2 2 0 0 0 2 2h16" /><path d="M18 17V9" /><path d="M13 17V5" /><path d="M8 17v-3" /></symbol>
  <symbol id="i-database" viewBox="0 0 24 24"><ellipse cx="12" cy="5" rx="9" ry="3" /><path d="M3 5V19A9 3 0 0 0 21 19V5" /><path d="M3 12A9 3 0 0 0 21 12" /></symbol>
  <symbol id="i-monitor" viewBox="0 0 24 24"><rect width="20" height="14" x="2" y="3" rx="2" /><line x1="8" x2="16" y1="21" y2="21" /><line x1="12" x2="12" y1="17" y2="21" /></symbol>
  <symbol id="i-lock" viewBox="0 0 24 24"><rect width="18" height="11" x="3" y="11" rx="2" ry="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" /></symbol>
  <symbol id="i-users" viewBox="0 0 24 24"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M22 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></symbol>
  <symbol id="i-hard-drive" viewBox="0 0 24 24"><line x1="22" x2="2" y1="12" y2="12" /><path d="M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z" /><line x1="6" x2="6.01" y1="16" y2="16" /><line x1="10" x2="10.01" y1="16" y2="16" /></symbol>
  <symbol id="i-sun" viewBox="0 0 24 24"><circle cx="12" cy="12" r="4" /><path d="M12 2v2" /><path d="M12 20v2" /><path d="m4.93 4.93 1.41 1.41" /><path d="m17.66 17.66 1.41 1.41" /><path d="M2 12h2" /><path d="M20 12h2" /><path d="m6.34 17.66-1.41 1.41" /><path d="m19.07 4.93-1.41 1.41" /></symbol>
  <symbol id="i-moon" viewBox="0 0 24 24"><path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z" /></symbol>
  <symbol id="i-sliders" viewBox="0 0 24 24"><line x1="21" x2="14" y1="4" y2="4" /><line x1="10" x2="3" y1="4" y2="4" /><line x1="21" x2="12" y1="12" y2="12" /><line x1="8" x2="3" y1="12" y2="12" /><line x1="21" x2="16" y1="20" y2="20" /><line x1="12" x2="3" y1="20" y2="20" /><line x1="14" x2="14" y1="2" y2="6" /><line x1="8" x2="8" y1="10" y2="14" /><line x1="16" x2="16" y1="18" y2="22" /></symbol>
  <symbol id="i-triangle-alert" viewBox="0 0 24 24"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3" /><path d="M12 9v4" /><path d="M12 17h.01" /></symbol>
`
    }
  }, undefined, false, undefined, this);
}

// server/glossary.ts
var HINTS = {
  "hub-results": { term: "Results", what: "The numbers your project relies on, each with the command and files that made it. ANVC flags one when what it depends on changes." },
  "hub-sources": { term: "Sources", what: "The pages, web searches and papers your agents read, with the text they got back, so the next agent reads the kept copy instead of fetching it again." },
  "result-part": { term: "Part", what: "The part of the project your agent filed these results under when it recorded them. Only changes to that part's files make a result stale." },
  "stat-shown": { term: "Past attempts shown", what: "Earlier attempts ANVC put in front of an agent: at a session start, after a failed command, or when it asked. Each counts once a session." },
  "stat-stopped": { term: "Commands stopped", what: "Commands ANVC stopped once because they failed in an earlier session. Your agent can run one again if something changed." },
  "stat-matched": { term: "Errors matched", what: "Failed commands whose error an earlier attempt had already hit. ANVC showed your agent that attempt." },
  "stat-recovered": { term: "Restored after compaction", what: "Times a session got its own earlier work back after its context was compacted." },
  "stat-rules": { term: "Writing rules given", what: "Times your agent got a rule set's text just before it wrote what the rules cover, such as a commit message." },
  "stat-asked": { term: "Lookups by your agent", what: "Times your agent searched ANVC or opened a record on its own." },
  "stat-avoided": { term: "Dead ends avoided", what: "An estimate. ANVC showed a dead end, and that session then recorded no new failure on the same files." },
  "stat-recorded": { term: "Attempts with a reason", what: "Attempts your agent recorded with a reason, kept or abandoned. The work log lists them." },
  "stat-autosaved": { term: "Attempts without a reason", what: "Work your agent didn't record, which ANVC saved from the raw log. The work log shows it under No reason." },
  "stat-absorbed": { term: "Goal and rule updates", what: "Updates a small model made to the goals and writing rules from your sessions, when that is on." },
  "stat-confirmed": { term: "Marked helpful", what: "Records your agent or you marked as helpful." },
  "stat-added": { term: "Tokens added to agents' context", what: "Everything ANVC gave your agents so far, estimated at 4 characters a token.", why: "For scale: one request from your agent in a long session sends about 300,000 tokens." },
  "stat-absorb-tokens": { term: "Tokens for goal updates", what: "What the small model used to update goals and writing rules, outside your sessions." },
  absorb: {
    term: "Goals, rules and map from your sessions",
    what: "After your agent's turns, at most every half hour, a small model reads what's new and updates the goals, writing rules and map. It runs through your claude or codex login, apart from your agent.",
    why: "The first update reads more: about 8,000 tokens with Claude Haiku. For scale, one request from your agent in a long session sends about 300,000."
  },
  "project-map": {
    term: "Map",
    what: "The parts of your project and how they connect: drawn from your code's imports, with what each part is for from your agent's notes."
  },
  "project-status": {
    term: "Status",
    what: "What each agent session is doing now, the work finished recently and whether it's committed, pushed or released, and what's queued next.",
    why: "Your agent is given this list when a session starts and again after its context is compacted. You can turn that off in Settings, under Your agent."
  },
  "project-goals": {
    term: "Goals",
    what: "What the project is for, as goals and sub-goals, each To do, In progress, Done or Dropped. You and your agents can add and change them, and every change keeps who made it and why.",
    why: "Your agent is given the goals when a session starts, and links the work it records to the sub-goal it served."
  },
  "project-rules": {
    term: "Writing rules",
    what: "Each rule set names a kind of text, such as commit messages or the files matching server/**/*.tsx, and where its rules are written, usually a heading in AGENTS.md.",
    why: "Your agent is given the list when a session starts, and a rule set's text right before it writes text the set covers."
  },
  "project-tools": {
    term: "Tools",
    what: "The MCP servers, plugins, skills, commands and hooks each agent has, read from that agent's own config files, and whether each is on. ANVC never changes them.",
    why: "A note says when to use a tool. Your agents are given the notes when a session starts."
  },
  authored: {
    term: "Agent-written",
    what: "The agent wrote this record itself, in its own words, when it finished the work."
  },
  captured: {
    term: "Saved from the log",
    what: "Your agent didn't record this, so ANVC saved what the log saw: commands, files and what failed. Only the agent can say why.",
    why: "Ask your agent to use anvc_checkpoint and it will title its work and say why."
  },
  anchor: {
    term: "Commit",
    what: "The commit the agent started from."
  },
  continued: {
    term: "Retries",
    what: "This attempt retried an earlier one that was abandoned."
  },
  output: {
    term: "Output",
    what: "What the failing command printed, word for word.",
    why: "Compare it with the agent's reason above."
  },
  "ruled-out": {
    term: "Ruled out",
    what: "Other approaches the agent considered and set aside, each with its reason."
  },
  "not-investigated": {
    term: "Not checked",
    what: "Questions the agent left open. Unlike ruled out, these might still work."
  },
  recheck: {
    term: "Recheck command",
    what: "One command that shows whether this outcome still holds. Run it before trusting an old dead end."
  },
  steps: {
    term: "Steps",
    what: "Every file read, file written and command run during the attempt, in order."
  },
  private: {
    term: "Private",
    what: "Only on this computer. Never pushed.",
    why: "Your agent can still read it. To share one: anvc share <id>."
  },
  shared: {
    term: "Shared",
    what: "Pushed with your code, with paths made relative and your prompts removed."
  },
  shown: {
    term: "Shown",
    what: "Past attempts ANVC showed an agent without being asked."
  },
  opened: {
    term: "Opened",
    what: "Past attempts an agent looked up itself."
  },
  avoided: {
    term: "Avoided",
    what: "Dead ends an agent was shown and didn't repeat. This is an estimate."
  },
  confirmed: {
    term: "Confirmed",
    what: "Past attempts an agent marked as helpful."
  },
  "earlier-version": {
    term: "Earlier version",
    what: "What this part was described as before the current description replaced it."
  }
};

// server/widgets.tsx
var send = (path, body, method = "POST") => fetch(path, { method, headers: { "content-type": "application/json", "x-anvc": "1" }, body: JSON.stringify(body) });
var getJson = (path, init) => fetch(path, init).then((r) => r.json());
var plural = (n, one, many = `${one}s`) => `${n.toLocaleString()} ${n === 1 ? one : many}`;
var when = (ts) => new Date(ts).toLocaleString(undefined, { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
function useLive(path) {
  const [data, setData] = d2(null);
  const [error, setError] = d2("");
  h2(() => {
    const load = () => void getJson(path).then((v) => !v.error && setData(v)).catch(() => {});
    load();
    const timer = setInterval(load, 1e4);
    return () => clearInterval(timer);
  }, [path]);
  const save = async (change) => {
    try {
      const r = await send(path, change);
      const out = await r.json();
      if (!r.ok || out.error) {
        setError(out.error ?? "Couldn't save.");
        return false;
      }
      setError("");
      setData(out);
      return true;
    } catch {
      setError("Can't reach ANVC.");
      return false;
    }
  };
  return { data, error, save };
}
function TitleForm({ label, placeholder = label, submit, initial = "", changed = false, onSave, onCancel, children }) {
  const [title, setTitle] = d2(initial);
  return /* @__PURE__ */ u3("form", {
    class: "title-form",
    onSubmit: (e) => {
      e.preventDefault();
      if (title.trim())
        onSave(title.trim());
    },
    children: [
      /* @__PURE__ */ u3("input", {
        value: title,
        onInput: (e) => setTitle(e.currentTarget.value),
        "aria-label": label,
        placeholder,
        maxLength: 200,
        autoFocus: true
      }, undefined, false, undefined, this),
      children,
      /* @__PURE__ */ u3("button", {
        type: "submit",
        class: "button primary",
        disabled: !title.trim() || title.trim() === initial && !changed,
        children: submit
      }, undefined, false, undefined, this),
      /* @__PURE__ */ u3("button", {
        type: "button",
        class: "button",
        onClick: onCancel,
        children: "Cancel"
      }, undefined, false, undefined, this)
    ]
  }, undefined, true, undefined, this);
}
function Icon({ name, size = 16 }) {
  return /* @__PURE__ */ u3("svg", {
    class: "icon",
    width: size,
    height: size,
    fill: "none",
    stroke: "currentColor",
    "stroke-width": "1.65",
    "stroke-linecap": "round",
    "stroke-linejoin": "round",
    "aria-hidden": "true",
    children: /* @__PURE__ */ u3("use", {
      href: `#i-${name}`
    }, undefined, false, undefined, this)
  }, undefined, false, undefined, this);
}
function Modal({ open, onClose, children, ...attrs }) {
  const ref = A2(null);
  h2(() => {
    const dialog = ref.current;
    if (open && !dialog.open)
      dialog.showModal();
    if (!open)
      dialog.close();
  }, [open]);
  return /* @__PURE__ */ u3("dialog", {
    ...attrs,
    ref,
    onClose: () => {
      if (open)
        onClose();
    },
    onClick: (event) => {
      const box = ref.current.getBoundingClientRect();
      const outside = event.clientX < box.left || event.clientX > box.right || event.clientY < box.top || event.clientY > box.bottom;
      if (event.target === ref.current && outside)
        ref.current.close();
    },
    children
  }, undefined, false, undefined, this);
}
function OutcomeBadge({ status }) {
  const lost = status === "abandoned";
  return /* @__PURE__ */ u3("span", {
    class: `outcome ${lost ? "abandoned" : "kept"}`,
    children: [
      /* @__PURE__ */ u3(Icon, {
        name: lost ? "circle-x" : "circle-check",
        size: 13
      }, undefined, false, undefined, this),
      lost ? "Abandoned" : "Kept"
    ]
  }, undefined, true, undefined, this);
}
function Source({ authored }) {
  return /* @__PURE__ */ u3("span", {
    class: "source",
    title: authored ? "The agent stated this goal" : "Rebuilt from the session. The agent didn't state a goal.",
    children: authored ? "Agent-written" : "Captured"
  }, undefined, false, undefined, this);
}
function Track({
  actions,
  seconds
}) {
  return /* @__PURE__ */ u3("div", {
    class: "track",
    "aria-label": `${actions.length} recorded steps over ${seconds} seconds`,
    children: actions.map((action, i) => /* @__PURE__ */ u3("span", {
      class: `seg ${action.kind}`,
      style: {
        left: `${Math.max(0, Math.min(100, action.at / Math.max(seconds, 1) * 100))}%`
      },
      title: `${action.at}s · ${action.kind === "shell" ? "command" : action.kind} · ${action.label}`
    }, i, false, undefined, this))
  }, undefined, false, undefined, this);
}
function Field({
  title,
  hint,
  children
}) {
  return /* @__PURE__ */ u3("section", {
    class: "detail-section",
    children: [
      /* @__PURE__ */ u3("h3", {
        children: hint ? /* @__PURE__ */ u3(Hint, {
          id: hint,
          children: title
        }, undefined, false, undefined, this) : title
      }, undefined, false, undefined, this),
      children
    ]
  }, undefined, true, undefined, this);
}
function Hint({ id, children }) {
  const hint = HINTS[id];
  if (!hint)
    return /* @__PURE__ */ u3(S, {
      children
    }, undefined, false, undefined, this);
  return /* @__PURE__ */ u3("span", {
    class: "hint",
    children: [
      children,
      /* @__PURE__ */ u3("button", {
        class: "hint-mark",
        type: "button",
        "aria-label": `What does ${hint.term} mean?`,
        onClick: (event) => event.stopPropagation(),
        children: /* @__PURE__ */ u3(Icon, {
          name: "circle-help",
          size: 12
        }, undefined, false, undefined, this)
      }, undefined, false, undefined, this),
      /* @__PURE__ */ u3("span", {
        class: "hint-panel",
        role: "tooltip",
        children: [
          /* @__PURE__ */ u3("b", {
            children: hint.term
          }, undefined, false, undefined, this),
          /* @__PURE__ */ u3("span", {
            children: hint.what
          }, undefined, false, undefined, this),
          hint.why && /* @__PURE__ */ u3("span", {
            class: "hint-why",
            children: hint.why
          }, undefined, false, undefined, this)
        ]
      }, undefined, true, undefined, this)
    ]
  }, undefined, true, undefined, this);
}
function Segmented({ value, options, onChange, label }) {
  return /* @__PURE__ */ u3("div", {
    class: "choice",
    role: "radiogroup",
    "aria-label": label,
    children: options.map(([v, text]) => /* @__PURE__ */ u3("button", {
      type: "button",
      role: "radio",
      "aria-checked": value === v,
      class: `choice-${v}${value === v ? " is-on" : ""}`,
      onClick: () => onChange(v),
      children: text
    }, v, false, undefined, this))
  }, undefined, false, undefined, this);
}
function Scope({ scope, own, onScope, onFollow }) {
  return /* @__PURE__ */ u3(S, {
    children: [
      /* @__PURE__ */ u3("div", {
        class: "scope",
        children: /* @__PURE__ */ u3(Segmented, {
          label: "Applies to",
          value: scope,
          onChange: onScope,
          options: [["everywhere", "Every project"], ["project", "This project"]]
        }, undefined, false, undefined, this)
      }, undefined, false, undefined, this),
      scope === "project" && (own ? /* @__PURE__ */ u3("p", {
        class: "settings-sub",
        children: [
          "This project has its own choice.",
          " ",
          /* @__PURE__ */ u3("button", {
            type: "button",
            class: "link-button",
            onClick: onFollow,
            children: "Use the one for every project"
          }, undefined, false, undefined, this)
        ]
      }, undefined, true, undefined, this) : /* @__PURE__ */ u3("p", {
        class: "settings-sub",
        children: "This project follows your choice for every project until you change something here."
      }, undefined, false, undefined, this))
    ]
  }, undefined, true, undefined, this);
}
function CopyButton({ text }) {
  const [state, setState] = d2("Copy");
  h2(() => {
    if (state === "Copy")
      return;
    const timer = setTimeout(() => setState("Copy"), 2500);
    return () => clearTimeout(timer);
  }, [state]);
  return /* @__PURE__ */ u3("button", {
    class: "copy-button",
    onClick: async () => {
      try {
        await navigator.clipboard.writeText(text);
        setState("Copied");
      } catch {
        setState("Select to copy");
      }
    },
    children: [
      /* @__PURE__ */ u3(Icon, {
        name: "copy",
        size: 14
      }, undefined, false, undefined, this),
      /* @__PURE__ */ u3("span", {
        "aria-live": "polite",
        children: state
      }, undefined, false, undefined, this)
    ]
  }, undefined, true, undefined, this);
}
var Copy = ({ text }) => /* @__PURE__ */ u3("div", {
  class: "copy-block",
  children: [
    /* @__PURE__ */ u3("code", {
      children: text
    }, undefined, false, undefined, this),
    /* @__PURE__ */ u3(CopyButton, {
      text
    }, undefined, false, undefined, this)
  ]
}, undefined, true, undefined, this);

// server/helped.tsx
function HelpedBlock() {
  const [data, setData] = d2(null);
  h2(() => {
    getJson("/api/helped", { signal: AbortSignal.timeout(1e4) }).then((body) => {
      if (!("error" in body))
        setData(body);
    }).catch(() => {});
  }, []);
  if (!data)
    return null;
  if (!data.shown && !data.opened && !data.avoided && !data.confirmed)
    return null;
  const parts = [
    data.opened > 0 && /* @__PURE__ */ u3(S, {
      children: [
        /* @__PURE__ */ u3(Hint, {
          id: "opened",
          children: "opened"
        }, undefined, false, undefined, this),
        " ",
        plural(data.opened, "record"),
        " themselves"
      ]
    }, undefined, true, undefined, this),
    data.avoided > 0 && /* @__PURE__ */ u3(S, {
      children: [
        /* @__PURE__ */ u3(Hint, {
          id: "avoided",
          children: "avoided"
        }, undefined, false, undefined, this),
        " about ",
        plural(data.avoided, "dead end")
      ]
    }, undefined, true, undefined, this),
    data.confirmed > 0 && /* @__PURE__ */ u3(S, {
      children: [
        /* @__PURE__ */ u3(Hint, {
          id: "confirmed",
          children: "marked"
        }, undefined, false, undefined, this),
        " ",
        data.confirmed,
        " as helpful"
      ]
    }, undefined, true, undefined, this)
  ].filter(Boolean);
  return /* @__PURE__ */ u3("section", {
    class: "helped",
    "aria-label": "ANVC activity",
    children: /* @__PURE__ */ u3("p", {
      class: "helped-line",
      children: [
        data.shown > 0 ? /* @__PURE__ */ u3(S, {
          children: [
            "Your agents were ",
            /* @__PURE__ */ u3(Hint, {
              id: "shown",
              children: "shown"
            }, undefined, false, undefined, this),
            " past work ",
            plural(data.shown, "time"),
            " in ",
            plural(data.sessions, "session")
          ]
        }, undefined, true, undefined, this) : /* @__PURE__ */ u3(S, {
          children: "Your agents"
        }, undefined, false, undefined, this),
        parts.map((part, i) => /* @__PURE__ */ u3(S, {
          children: [
            i === parts.length - 1 ? data.shown > 0 || i > 0 ? " and " : " " : data.shown > 0 || i > 0 ? ", " : " ",
            part
          ]
        }, undefined, true, undefined, this)),
        "."
      ]
    }, undefined, true, undefined, this)
  }, undefined, false, undefined, this);
}

// server/stats.tsx
var n2 = (x) => x.toLocaleString("en");
var lead = (label) => label.slice(0, label.lastIndexOf(" ") + 1);
var last = (label) => label.slice(label.lastIndexOf(" ") + 1);
function Section({ title, counts }) {
  const shown = counts.filter((c) => c.value > 0);
  const zero = counts.filter((c) => c.value === 0);
  return /* @__PURE__ */ u3("section", {
    children: [
      /* @__PURE__ */ u3("h3", {
        children: title
      }, undefined, false, undefined, this),
      shown.length > 0 && /* @__PURE__ */ u3("div", {
        class: "stat-list",
        children: shown.map((c) => /* @__PURE__ */ u3("div", {
          class: "stat",
          children: [
            /* @__PURE__ */ u3("span", {
              class: "stat-value",
              children: n2(c.value)
            }, undefined, false, undefined, this),
            /* @__PURE__ */ u3("span", {
              class: "stat-label",
              children: [
                lead(c.label),
                /* @__PURE__ */ u3(Hint, {
                  id: c.hint,
                  children: last(c.label)
                }, undefined, false, undefined, this)
              ]
            }, undefined, true, undefined, this),
            c.note && /* @__PURE__ */ u3("span", {
              class: "stat-note",
              children: c.note
            }, undefined, false, undefined, this)
          ]
        }, c.hint, true, undefined, this))
      }, undefined, false, undefined, this),
      zero.length > 0 && /* @__PURE__ */ u3("p", {
        class: "stat-zero",
        children: [
          "Not yet: ",
          zero.map((c) => c.label.toLowerCase()).join(", "),
          "."
        ]
      }, undefined, true, undefined, this)
    ]
  }, undefined, true, undefined, this);
}
function StatsPage() {
  const [s, setS] = d2(null);
  const [error, setError] = d2("");
  h2(() => {
    getJson("/api/stats", { signal: AbortSignal.timeout(20000) }).then((v) => v.error ? setError(v.error) : setS(v)).catch(() => setError("Couldn't read the logs"));
  }, []);
  if (error)
    return /* @__PURE__ */ u3("p", {
      class: "settings-status is-error",
      children: error
    }, undefined, false, undefined, this);
  if (!s)
    return /* @__PURE__ */ u3("p", {
      class: "map-empty",
      children: "Counting…"
    }, undefined, false, undefined, this);
  if (!s.since)
    return /* @__PURE__ */ u3("p", {
      class: "goals-empty",
      children: [
        /* @__PURE__ */ u3("b", {
          children: "Nothing yet."
        }, undefined, false, undefined, this),
        " ANVC hasn't done anything in this project so far."
      ]
    }, undefined, true, undefined, this);
  return /* @__PURE__ */ u3("div", {
    class: "stats",
    children: [
      /* @__PURE__ */ u3("p", {
        class: "stats-since",
        children: [
          "Since ",
          new Date(s.since).toLocaleDateString(undefined, { day: "numeric", month: "long", year: "numeric" })
        ]
      }, undefined, true, undefined, this),
      /* @__PURE__ */ u3(Section, {
        title: "For your agents",
        counts: [
          { value: s.shown, label: "Past attempts shown", hint: "stat-shown", note: `In ${n2(s.sessions)} session${s.sessions === 1 ? "" : "s"}` },
          { value: s.stopped, label: "Commands stopped", hint: "stat-stopped", note: `${n2(s.notRunAgain)} not run again` },
          { value: s.matched, label: "Errors matched to past work", hint: "stat-matched" },
          { value: s.recovered, label: "Restored after compaction", hint: "stat-recovered" },
          { value: s.rules, label: "Writing rules given", hint: "stat-rules" },
          { value: s.asked, label: "Lookups by your agent", hint: "stat-asked" },
          { value: s.avoided, label: "Dead ends avoided", hint: "stat-avoided", note: "Estimate" }
        ]
      }, undefined, false, undefined, this),
      /* @__PURE__ */ u3(Section, {
        title: "Recorded",
        counts: [
          { value: s.recorded, label: "Attempts with a reason", hint: "stat-recorded" },
          { value: s.saved, label: "Attempts without a reason", hint: "stat-autosaved" },
          { value: s.absorbed.updates, label: "Goal and rule updates", hint: "stat-absorbed" },
          { value: s.confirmed, label: "Marked helpful", hint: "stat-confirmed" }
        ]
      }, undefined, false, undefined, this),
      /* @__PURE__ */ u3(Section, {
        title: "Cost",
        counts: [
          { value: Math.round(s.added / 4), label: "Tokens added to agents' context", hint: "stat-added", note: "Estimate, in total" },
          { value: s.absorbed.tokens, label: "Tokens for goal updates", hint: "stat-absorb-tokens" }
        ]
      }, undefined, false, undefined, this)
    ]
  }, undefined, true, undefined, this);
}

// server/sources.tsx
var KIND = { page: "Page", search: "Search", document: "Document" };
var nameOf = (s) => s.kind === "search" ? `“${s.query ?? ""}”` : s.url ?? s.path ?? "";
var label = (s) => s.title ?? (s.path ? s.path.split(/[\\/]/).at(-1) : nameOf(s));
function Kept({ id, pdf }) {
  const [text, setText] = d2(undefined);
  h2(() => {
    getJson(`/api/sources?id=${encodeURIComponent(id)}`).then((v) => setText(v.source?.text ?? null)).catch(() => setText(null));
  }, [id]);
  if (text === undefined)
    return /* @__PURE__ */ u3("p", {
      class: "source-note",
      children: "Reading…"
    }, undefined, false, undefined, this);
  if (text === null)
    return /* @__PURE__ */ u3("p", {
      class: "source-note",
      children: [
        "No text was kept.",
        pdf && " Keeping a PDF's text needs pdftotext."
      ]
    }, undefined, true, undefined, this);
  return /* @__PURE__ */ u3("pre", {
    class: "source-text",
    children: text
  }, undefined, false, undefined, this);
}
function SourceRow({ s }) {
  const [open, setOpen] = d2(false);
  return /* @__PURE__ */ u3("details", {
    class: "source-item",
    onToggle: (e) => setOpen(e.currentTarget.open),
    children: [
      /* @__PURE__ */ u3("summary", {
        children: [
          /* @__PURE__ */ u3("span", {
            class: `source-kind is-${s.kind}`,
            children: KIND[s.kind]
          }, undefined, false, undefined, this),
          /* @__PURE__ */ u3("span", {
            class: "source-name",
            children: label(s)
          }, undefined, false, undefined, this),
          /* @__PURE__ */ u3("span", {
            class: "source-when",
            children: when(s.ts)
          }, undefined, false, undefined, this),
          /* @__PURE__ */ u3("span", {
            class: "source-meta",
            children: [
              "Session ",
              /* @__PURE__ */ u3("code", {
                children: s.session_id?.slice(0, 8) ?? "unknown"
              }, undefined, false, undefined, this),
              " · ",
              s.agent_name,
              s.chars === null && " · no text kept"
            ]
          }, undefined, true, undefined, this),
          s.links.length > 0 && /* @__PURE__ */ u3("ul", {
            class: "source-links",
            children: s.links.map((l) => /* @__PURE__ */ u3("li", {
              children: [
                l.kind === "result" ? /* @__PURE__ */ u3("span", {
                  class: "source-result",
                  children: "Result"
                }, undefined, false, undefined, this) : /* @__PURE__ */ u3(OutcomeBadge, {
                  status: l.status
                }, undefined, false, undefined, this),
                /* @__PURE__ */ u3("span", {
                  children: l.title || "No goal"
                }, undefined, false, undefined, this),
                /* @__PURE__ */ u3("small", {
                  children: l.how === "session" ? "same session" : "names it"
                }, undefined, false, undefined, this)
              ]
            }, l.id, true, undefined, this))
          }, undefined, false, undefined, this)
        ]
      }, undefined, true, undefined, this),
      /* @__PURE__ */ u3("div", {
        class: "source-body",
        children: [
          label(s) !== nameOf(s) && /* @__PURE__ */ u3("p", {
            class: "source-where",
            children: /* @__PURE__ */ u3("code", {
              children: nameOf(s)
            }, undefined, false, undefined, this)
          }, undefined, false, undefined, this),
          /^https?:\/\//i.test(s.url ?? "") && /* @__PURE__ */ u3("p", {
            class: "source-where",
            children: /* @__PURE__ */ u3("a", {
              href: s.url,
              target: "_blank",
              rel: "noopener noreferrer",
              children: [
                "Open the page ",
                /* @__PURE__ */ u3(Icon, {
                  name: "external-link",
                  size: 13
                }, undefined, false, undefined, this)
              ]
            }, undefined, true, undefined, this)
          }, undefined, false, undefined, this),
          s.asked && /* @__PURE__ */ u3("p", {
            class: "source-asked",
            children: [
              /* @__PURE__ */ u3("b", {
                children: "Asked"
              }, undefined, false, undefined, this),
              " ",
              s.asked
            ]
          }, undefined, true, undefined, this),
          open && /* @__PURE__ */ u3(Kept, {
            id: s.id,
            pdf: Boolean(s.path?.toLowerCase().endsWith(".pdf"))
          }, undefined, false, undefined, this)
        ]
      }, undefined, true, undefined, this)
    ]
  }, undefined, true, undefined, this);
}
function SourcesPage() {
  const [view, setView] = d2(null);
  const [query, setQuery] = d2("");
  h2(() => {
    const t = setTimeout(() => {
      getJson(`/api/sources?q=${encodeURIComponent(query.trim())}`).then(setView).catch(() => {});
    }, query ? 250 : 0);
    return () => clearTimeout(t);
  }, [query]);
  if (!view)
    return /* @__PURE__ */ u3("p", {
      class: "map-empty",
      children: "Reading sources…"
    }, undefined, false, undefined, this);
  return /* @__PURE__ */ u3("div", {
    class: "sources",
    children: [
      view.total > 0 && /* @__PURE__ */ u3("div", {
        class: "filterbar sources-bar",
        children: /* @__PURE__ */ u3("label", {
          class: "search",
          children: [
            /* @__PURE__ */ u3(Icon, {
              name: "search"
            }, undefined, false, undefined, this),
            /* @__PURE__ */ u3("input", {
              type: "search",
              "aria-label": "Search sources",
              placeholder: "Search sources…",
              value: query,
              onInput: (e) => setQuery(e.currentTarget.value)
            }, undefined, false, undefined, this)
          ]
        }, undefined, true, undefined, this)
      }, undefined, false, undefined, this),
      !view.on && /* @__PURE__ */ u3("p", {
        class: "source-note",
        children: "Sources are off here. Turn them on in Settings, under Raw log."
      }, undefined, false, undefined, this),
      view.on && !view.total && /* @__PURE__ */ u3("div", {
        class: "results-empty",
        children: [
          /* @__PURE__ */ u3("h2", {
            children: "No sources yet"
          }, undefined, false, undefined, this),
          /* @__PURE__ */ u3("p", {
            children: "The pages your agent fetches, its web searches, and the papers and notes it reads outside the project are kept here, with the text it got back."
          }, undefined, false, undefined, this)
        ]
      }, undefined, true, undefined, this),
      view.total > 0 && !view.sources.length && /* @__PURE__ */ u3("p", {
        class: "source-note",
        children: [
          'No source holds "',
          query,
          '".'
        ]
      }, undefined, true, undefined, this),
      view.sources.length > 0 && /* @__PURE__ */ u3("div", {
        class: "source-list",
        children: view.sources.map((s) => /* @__PURE__ */ u3(SourceRow, {
          s
        }, s.id, false, undefined, this))
      }, undefined, false, undefined, this)
    ]
  }, undefined, true, undefined, this);
}

// server/results.tsx
var LABEL = { draft: "Draft", current: "Current", locked: "Locked", superseded: "Superseded", invalid: "Invalid" };
var FILTERS = [["all", "All"], ["look", "Needs a look"], ["locked", "Locked"], ["current", "Current"], ["superseded", "Superseded"], ["invalid", "Invalid"]];
var day = (ts) => new Date(ts).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });
var needsLook = (r) => Boolean(r.proposed) || (r.status === "locked" || r.status === "current") && r.check.stale;
async function decide(body) {
  const r = await send("/api/results", body);
  return r.ok ? await r.json() : null;
}
function FileLine({ path, state, now }) {
  const words = state === "same" ? "unchanged" : state === "changed" ? now ? `changed, now ${now}` : "changed" : state === "missing" ? "not on this computer" : "not checked";
  return /* @__PURE__ */ u3("span", {
    class: `result-file is-${state}`,
    children: [
      /* @__PURE__ */ u3("code", {
        children: path
      }, undefined, false, undefined, this),
      /* @__PURE__ */ u3("span", {
        class: "state-badge",
        children: words
      }, undefined, false, undefined, this)
    ]
  }, undefined, true, undefined, this);
}
function changes(before, after) {
  const keys = [...new Set([...Object.keys(before), ...Object.keys(after)])];
  return keys.flatMap((k) => before[k] === after[k] ? [] : before[k] === undefined ? [`${k}=${after[k]}`] : after[k] === undefined ? [`no ${k}`] : [`${k} ${before[k]} → ${after[k]}`]);
}
function lineage(r, byId) {
  const seen = new Set([r.id]);
  const older = [];
  for (let at = r;at.replaces && byId.has(at.replaces) && !seen.has(at.replaces); ) {
    at = byId.get(at.replaces);
    seen.add(at.id);
    older.unshift(at);
  }
  const newer = [];
  for (let at = r;at.replaced_by && byId.has(at.replaced_by) && !seen.has(at.replaced_by); ) {
    at = byId.get(at.replaced_by);
    seen.add(at.id);
    newer.push(at);
  }
  return [...older, r, ...newer];
}
function Lineage({ r, byId, onJump }) {
  const line = lineage(r, byId);
  if (line.length < 2)
    return null;
  return /* @__PURE__ */ u3("div", {
    class: "result-lineage",
    children: [
      /* @__PURE__ */ u3("h4", {
        children: "Versions"
      }, undefined, false, undefined, this),
      /* @__PURE__ */ u3("ol", {
        children: line.map((v, i) => /* @__PURE__ */ u3("li", {
          class: `${v.id === r.id ? "is-this " : ""}is-${v.status}`,
          children: [
            /* @__PURE__ */ u3("span", {
              class: "lineage-when",
              children: day(v.ts)
            }, undefined, false, undefined, this),
            v.id === r.id ? /* @__PURE__ */ u3("b", {
              children: v.value
            }, undefined, false, undefined, this) : /* @__PURE__ */ u3("button", {
              type: "button",
              class: "link-button",
              onClick: () => onJump(v.id),
              children: v.value
            }, undefined, false, undefined, this),
            /* @__PURE__ */ u3("span", {
              class: `result-status is-${v.status}`,
              children: LABEL[v.status]
            }, undefined, false, undefined, this),
            i > 0 && changes(line[i - 1].settings, v.settings).map((c) => /* @__PURE__ */ u3("code", {
              children: c
            }, c, false, undefined, this)),
            v.why && /* @__PURE__ */ u3("small", {
              children: v.why
            }, undefined, false, undefined, this)
          ]
        }, v.id, true, undefined, this))
      }, undefined, false, undefined, this)
    ]
  }, undefined, true, undefined, this);
}
var DONE = { draft: "Marked draft", current: "Marked current", locked: "Locked", superseded: "Marked superseded", invalid: "Marked invalid" };
var ASKED = { draft: "draft", current: "current", locked: "locking it", superseded: "superseded", invalid: "marking it invalid" };
function Timeline({ results, byId, onJump }) {
  const moments = results.flatMap((r) => {
    const before = r.replaces ? byId.get(r.replaces) : undefined;
    const made = { ts: r.ts, r, what: before ? `Replaced ${before.value}` : "Recorded", why: r.history[0]?.why ?? r.why, changed: before ? changes(before.settings, r.settings) : [] };
    const later = r.history.slice(1).map((h) => ({
      ts: h.ts,
      r,
      why: h.why,
      changed: [],
      what: h.proposed ? `Your agent proposed ${ASKED[h.status]}` : `${DONE[h.status]}${h.by === "person" ? " by you" : ""}`
    }));
    return [made, ...later];
  }).sort((a, b) => b.ts.localeCompare(a.ts));
  const days = new Map;
  for (const m of moments)
    (days.get(day(m.ts)) ?? days.set(day(m.ts), []).get(day(m.ts))).push(m);
  return /* @__PURE__ */ u3("div", {
    class: "results-timeline",
    children: [...days].map(([date, list]) => /* @__PURE__ */ u3("section", {
      children: [
        /* @__PURE__ */ u3("h2", {
          children: date
        }, undefined, false, undefined, this),
        /* @__PURE__ */ u3("ol", {
          children: list.map((m) => /* @__PURE__ */ u3("li", {
            children: [
              /* @__PURE__ */ u3("span", {
                class: "timeline-time",
                children: new Date(m.ts).toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" })
              }, undefined, false, undefined, this),
              /* @__PURE__ */ u3("div", {
                children: [
                  /* @__PURE__ */ u3("p", {
                    children: [
                      m.r.part && /* @__PURE__ */ u3("span", {
                        class: "timeline-part",
                        children: m.r.part
                      }, undefined, false, undefined, this),
                      /* @__PURE__ */ u3("button", {
                        type: "button",
                        class: "link-button",
                        onClick: () => onJump(m.r.id),
                        children: [
                          m.r.name,
                          " = ",
                          m.r.value
                        ]
                      }, undefined, true, undefined, this),
                      /* @__PURE__ */ u3("span", {
                        class: "timeline-what",
                        children: m.what
                      }, undefined, false, undefined, this),
                      m.changed.map((c) => /* @__PURE__ */ u3("code", {
                        children: c
                      }, c, false, undefined, this))
                    ]
                  }, undefined, true, undefined, this),
                  m.why && /* @__PURE__ */ u3("small", {
                    children: m.why
                  }, undefined, false, undefined, this)
                ]
              }, undefined, true, undefined, this)
            ]
          }, m.ts + m.r.id + m.what, true, undefined, this))
        }, undefined, false, undefined, this)
      ]
    }, date, true, undefined, this))
  }, undefined, false, undefined, this);
}
function Card({ r, byId, onDecide, onJump, focus }) {
  const [open, setOpen] = d2(false);
  const [asking, setAsking] = d2(false);
  const [why, setWhy] = d2("");
  h2(() => {
    if (focus === r.id)
      setOpen(true);
  }, [focus]);
  const verdict = r.status === "locked" ? r.check.stale ? "Locked, but something it depends on changed since. Worth a look before anyone re-runs it." : null : r.status === "invalid" ? "Don't use this value." : r.check.stale ? r.status === "draft" ? "Something it depends on changed since it was recorded. It's a draft, so it isn't flagged." : "Something it depends on changed since it was recorded." : null;
  const facts = r.source || r.check.depends.length || r.check.derived.length || Object.keys(r.settings).length || r.used_in.length;
  return /* @__PURE__ */ u3("article", {
    id: `result-${r.id}`,
    class: `result-card is-${r.status}${needsLook(r) ? " needs-look" : ""}${open ? " is-open" : ""}`,
    children: [
      /* @__PURE__ */ u3("button", {
        type: "button",
        class: "result-row",
        "aria-expanded": open,
        onClick: () => setOpen(!open),
        children: [
          /* @__PURE__ */ u3("span", {
            class: "result-name",
            children: [
              /* @__PURE__ */ u3("b", {
                children: r.name
              }, undefined, false, undefined, this),
              /* @__PURE__ */ u3("span", {
                class: "result-sub",
                children: [
                  /* @__PURE__ */ u3("span", {
                    class: "result-value",
                    children: r.value
                  }, undefined, false, undefined, this),
                  /* @__PURE__ */ u3("span", {
                    class: "result-when",
                    children: [
                      "· ",
                      day(r.ts),
                      r.after_the_fact ? ", recorded after the fact" : ""
                    ]
                  }, undefined, true, undefined, this)
                ]
              }, undefined, true, undefined, this)
            ]
          }, undefined, true, undefined, this),
          /* @__PURE__ */ u3("span", {
            class: "result-pill",
            children: [
              r.check.stale && !needsLook(r) && r.status !== "invalid" && /* @__PURE__ */ u3("span", {
                class: "result-changed",
                title: "Something it depends on changed since it was recorded",
                children: /* @__PURE__ */ u3(Icon, {
                  name: "triangle-alert",
                  size: 14
                }, undefined, false, undefined, this)
              }, undefined, false, undefined, this),
              r.proposed ? /* @__PURE__ */ u3("span", {
                class: "result-flag is-ask",
                title: "Your agent proposed a change. Open it to accept or keep it as it is.",
                children: "Waiting for you"
              }, undefined, false, undefined, this) : needsLook(r) ? /* @__PURE__ */ u3("span", {
                class: "result-flag is-warn",
                title: "Something it depends on changed since it was recorded.",
                children: "Needs a look"
              }, undefined, false, undefined, this) : /* @__PURE__ */ u3("span", {
                class: `result-status is-${r.status}`,
                children: [
                  r.status === "locked" && /* @__PURE__ */ u3(Icon, {
                    name: "lock",
                    size: 13
                  }, undefined, false, undefined, this),
                  LABEL[r.status]
                ]
              }, undefined, true, undefined, this)
            ]
          }, undefined, true, undefined, this),
          /* @__PURE__ */ u3(Icon, {
            name: open ? "chevron-up" : "chevron-down",
            size: 16
          }, undefined, false, undefined, this)
        ]
      }, undefined, true, undefined, this),
      open && /* @__PURE__ */ u3("div", {
        class: "result-body",
        children: [
          verdict && /* @__PURE__ */ u3("p", {
            class: `result-verdict${needsLook(r) || r.status === "invalid" ? "" : " is-quiet"}`,
            children: [
              /* @__PURE__ */ u3(Icon, {
                name: "triangle-alert",
                size: 14
              }, undefined, false, undefined, this),
              verdict
            ]
          }, undefined, true, undefined, this),
          (r.proposed || needsLook(r)) && /* @__PURE__ */ u3("p", {
            class: "result-state",
            children: [
              "Status: ",
              /* @__PURE__ */ u3("b", {
                children: LABEL[r.status]
              }, undefined, false, undefined, this)
            ]
          }, undefined, true, undefined, this),
          r.why && /* @__PURE__ */ u3("section", {
            class: "result-section",
            children: [
              /* @__PURE__ */ u3("h4", {
                children: "Why"
              }, undefined, false, undefined, this),
              /* @__PURE__ */ u3("p", {
                class: "result-why",
                children: r.why
              }, undefined, false, undefined, this)
            ]
          }, undefined, true, undefined, this),
          facts ? /* @__PURE__ */ u3("section", {
            class: "result-section",
            children: [
              /* @__PURE__ */ u3("h4", {
                children: "Where it came from"
              }, undefined, false, undefined, this),
              /* @__PURE__ */ u3("dl", {
                class: "result-facts",
                children: [
                  r.source && /* @__PURE__ */ u3(S, {
                    children: [
                      /* @__PURE__ */ u3("dt", {
                        children: "From"
                      }, undefined, false, undefined, this),
                      /* @__PURE__ */ u3("dd", {
                        children: /* @__PURE__ */ u3(FileLine, {
                          path: `${r.source.path}${r.source.key ? ` → ${r.source.key}` : ""}`,
                          state: r.check.source?.state ?? "unknown",
                          now: r.check.source?.now
                        }, undefined, false, undefined, this)
                      }, undefined, false, undefined, this)
                    ]
                  }, undefined, true, undefined, this),
                  r.check.depends.length > 0 && /* @__PURE__ */ u3(S, {
                    children: [
                      /* @__PURE__ */ u3("dt", {
                        children: "Depends on"
                      }, undefined, false, undefined, this),
                      /* @__PURE__ */ u3("dd", {
                        class: "result-depends",
                        children: r.check.depends.map((d) => /* @__PURE__ */ u3(FileLine, {
                          path: d.path,
                          state: d.state
                        }, d.path, false, undefined, this))
                      }, undefined, false, undefined, this)
                    ]
                  }, undefined, true, undefined, this),
                  r.check.derived.length > 0 && /* @__PURE__ */ u3(S, {
                    children: [
                      /* @__PURE__ */ u3("dt", {
                        children: "Computed from"
                      }, undefined, false, undefined, this),
                      /* @__PURE__ */ u3("dd", {
                        class: "result-depends",
                        children: r.check.derived.map((d) => /* @__PURE__ */ u3("button", {
                          type: "button",
                          class: "link-button",
                          onClick: () => onJump(d.id),
                          children: [
                            d.name,
                            " (",
                            d.status,
                            ")"
                          ]
                        }, d.id, true, undefined, this))
                      }, undefined, false, undefined, this)
                    ]
                  }, undefined, true, undefined, this),
                  Object.keys(r.settings).length > 0 && /* @__PURE__ */ u3(S, {
                    children: [
                      /* @__PURE__ */ u3("dt", {
                        children: "Settings"
                      }, undefined, false, undefined, this),
                      /* @__PURE__ */ u3("dd", {
                        class: "result-settings",
                        children: Object.entries(r.settings).map(([k, v]) => /* @__PURE__ */ u3("code", {
                          children: [
                            k,
                            "=",
                            v
                          ]
                        }, k, true, undefined, this))
                      }, undefined, false, undefined, this)
                    ]
                  }, undefined, true, undefined, this),
                  r.used_in.length > 0 && /* @__PURE__ */ u3(S, {
                    children: [
                      /* @__PURE__ */ u3("dt", {
                        children: "Used in"
                      }, undefined, false, undefined, this),
                      /* @__PURE__ */ u3("dd", {
                        children: r.used_in.join(" · ")
                      }, undefined, false, undefined, this)
                    ]
                  }, undefined, true, undefined, this)
                ]
              }, undefined, true, undefined, this)
            ]
          }, undefined, true, undefined, this) : null,
          r.command && /* @__PURE__ */ u3("section", {
            class: "result-section",
            children: [
              /* @__PURE__ */ u3("h4", {
                children: "Made by"
              }, undefined, false, undefined, this),
              /* @__PURE__ */ u3("pre", {
                class: "result-command",
                children: r.command
              }, undefined, false, undefined, this)
            ]
          }, undefined, true, undefined, this),
          /* @__PURE__ */ u3(Lineage, {
            r,
            byId,
            onJump
          }, undefined, false, undefined, this),
          r.proposed && /* @__PURE__ */ u3("div", {
            class: "result-proposal",
            children: [
              /* @__PURE__ */ u3("p", {
                children: [
                  r.proposed.status === "locked" ? "Your agent proposed locking this" : `Your agent proposed marking this ${LABEL[r.proposed.status].toLowerCase()}`,
                  r.proposed.why ? `: ${r.proposed.why}` : "."
                ]
              }, undefined, true, undefined, this),
              /* @__PURE__ */ u3("button", {
                type: "button",
                class: "button primary",
                onClick: () => onDecide({ id: r.id, status: r.proposed.status, why: r.proposed.why }),
                children: r.proposed.status === "locked" ? "Lock" : `Mark ${LABEL[r.proposed.status].toLowerCase()}`
              }, undefined, false, undefined, this),
              /* @__PURE__ */ u3("button", {
                type: "button",
                class: "button",
                onClick: () => onDecide({ id: r.id, status: r.status, why: "Kept as it was." }),
                children: "Keep as it is"
              }, undefined, false, undefined, this)
            ]
          }, undefined, true, undefined, this),
          /* @__PURE__ */ u3("footer", {
            class: "result-actions",
            children: [
              r.status === "locked" ? /* @__PURE__ */ u3("button", {
                type: "button",
                class: "button",
                onClick: () => onDecide({ id: r.id, status: "current", why: "Unlocked." }),
                children: "Unlock"
              }, undefined, false, undefined, this) : r.status !== "invalid" && r.proposed?.status !== "locked" && /* @__PURE__ */ u3("button", {
                type: "button",
                class: "button",
                title: "Mark it final, so your agent doesn't re-run or replace it",
                onClick: () => onDecide({ id: r.id, status: "locked", why: "Locked." }),
                children: [
                  /* @__PURE__ */ u3(Icon, {
                    name: "lock",
                    size: 14
                  }, undefined, false, undefined, this),
                  " Lock"
                ]
              }, undefined, true, undefined, this),
              r.status !== "invalid" && !asking && /* @__PURE__ */ u3("button", {
                type: "button",
                class: "button",
                onClick: () => setAsking(true),
                children: "Mark invalid"
              }, undefined, false, undefined, this),
              r.status === "invalid" && /* @__PURE__ */ u3("button", {
                type: "button",
                class: "button",
                onClick: () => onDecide({ id: r.id, status: "current", why: "Valid again." }),
                children: "Mark valid"
              }, undefined, false, undefined, this),
              asking && /* @__PURE__ */ u3("form", {
                class: "result-invalid",
                onSubmit: (e) => {
                  e.preventDefault();
                  onDecide({ id: r.id, status: "invalid", why: why.trim() || "Marked invalid." });
                  setAsking(false);
                },
                children: [
                  /* @__PURE__ */ u3("input", {
                    id: `why-${r.id}`,
                    value: why,
                    onInput: (e) => setWhy(e.currentTarget.value),
                    placeholder: "Why is it wrong?",
                    "aria-label": "Why is it wrong?"
                  }, undefined, false, undefined, this),
                  /* @__PURE__ */ u3("button", {
                    type: "submit",
                    class: "button primary",
                    children: "Mark invalid"
                  }, undefined, false, undefined, this),
                  /* @__PURE__ */ u3("button", {
                    type: "button",
                    class: "button",
                    onClick: () => setAsking(false),
                    children: "Cancel"
                  }, undefined, false, undefined, this)
                ]
              }, undefined, true, undefined, this),
              /* @__PURE__ */ u3("span", {
                class: "result-id",
                children: [
                  "id ",
                  r.id
                ]
              }, undefined, true, undefined, this)
            ]
          }, undefined, true, undefined, this)
        ]
      }, undefined, true, undefined, this)
    ]
  }, undefined, true, undefined, this);
}
var MARK = { found: "✓", changed: "⚠", unsure: "~", missing: "?" };
var GROUPS = [
  ["changed", "Changed since", "What these came from changed after the document was written."],
  ["missing", "Not found", "Worked out by hand, from a run before ANVC, or from somewhere else. Ask your agent to record how it was made."],
  ["unsure", "Unsure", "Something printed it, but it could have been something else."],
  ["found", "Found", ""]
];
var lineList = (lines) => `${lines.length > 1 ? "lines" : "line"} ${lines.slice(0, 4).join(", ")}${lines.length > 4 ? " …" : ""}`;
function DocumentCheck() {
  const [documents, setDocuments] = d2([]);
  const [path, setPath] = d2("");
  const [checked, setChecked] = d2(null);
  const [busy, setBusy] = d2(false);
  const [error, setError] = d2("");
  h2(() => {
    getJson("/api/check").then((v) => {
      setDocuments(v.documents ?? []);
      setPath((p) => p || (v.documents?.includes("README.md") ? "README.md" : ""));
    }).catch(() => {});
  }, []);
  const run = async () => {
    setBusy(true);
    setError("");
    try {
      const v = await getJson(`/api/check?path=${encodeURIComponent(path.trim())}`);
      if (v.error || !v.rows) {
        setError(v.error ?? "Couldn't check it.");
        setChecked(null);
      } else
        setChecked({ path: v.path, rows: v.rows });
    } catch {
      setError("Couldn't reach ANVC.");
    }
    setBusy(false);
  };
  const groups = GROUPS.map(([state, label, note]) => {
    const rows = checked?.rows.filter((r) => r.state === state) ?? [];
    return { state, label, note, rows, count: rows.reduce((n, r) => n + r.lines.length, 0) };
  }).filter((g) => g.rows.length > 0);
  const numbers = checked?.rows.reduce((n, r) => n + r.lines.length, 0) ?? 0;
  return /* @__PURE__ */ u3("section", {
    class: "doc-check",
    children: [
      /* @__PURE__ */ u3("form", {
        class: "doc-check-bar",
        onSubmit: (e) => {
          e.preventDefault();
          run();
        },
        children: [
          /* @__PURE__ */ u3("label", {
            for: "doc-check-path",
            children: "Check a document"
          }, undefined, false, undefined, this),
          /* @__PURE__ */ u3("input", {
            id: "doc-check-path",
            list: "doc-check-documents",
            placeholder: "README.md",
            value: path,
            onInput: (e) => setPath(e.currentTarget.value),
            spellcheck: false,
            autocomplete: "off"
          }, undefined, false, undefined, this),
          /* @__PURE__ */ u3("datalist", {
            id: "doc-check-documents",
            children: documents.map((d) => /* @__PURE__ */ u3("option", {
              value: d
            }, d, false, undefined, this))
          }, undefined, false, undefined, this),
          /* @__PURE__ */ u3("button", {
            type: "submit",
            class: "button",
            disabled: !path.trim() || busy,
            children: busy ? "Checking…" : "Check"
          }, undefined, false, undefined, this),
          checked && /* @__PURE__ */ u3("button", {
            type: "button",
            class: "link-button",
            onClick: () => setChecked(null),
            children: "Close"
          }, undefined, false, undefined, this),
          !checked && /* @__PURE__ */ u3("span", {
            class: "doc-check-hint",
            children: "Finds where each number in it came from."
          }, undefined, false, undefined, this)
        ]
      }, undefined, true, undefined, this),
      error && /* @__PURE__ */ u3("p", {
        class: "settings-sub",
        children: error
      }, undefined, false, undefined, this),
      checked && /* @__PURE__ */ u3("div", {
        class: "doc-check-result",
        children: [
          /* @__PURE__ */ u3("p", {
            class: "doc-check-summary",
            children: [
              /* @__PURE__ */ u3("b", {
                children: checked.path
              }, undefined, false, undefined, this),
              ": ",
              plural(numbers, "number"),
              ".",
              " ",
              groups.map((g) => `${g.count} ${g.label.toLowerCase()}`).join(", "),
              "."
            ]
          }, undefined, true, undefined, this),
          groups.map(({ state, label, note, rows, count }) => /* @__PURE__ */ u3("details", {
            class: `doc-check-group is-${state}`,
            open: state !== "found",
            children: [
              /* @__PURE__ */ u3("summary", {
                children: [
                  /* @__PURE__ */ u3("span", {
                    class: "doc-mark",
                    children: MARK[state]
                  }, undefined, false, undefined, this),
                  label,
                  /* @__PURE__ */ u3("span", {
                    class: "doc-count",
                    children: count
                  }, undefined, false, undefined, this)
                ]
              }, undefined, true, undefined, this),
              note && /* @__PURE__ */ u3("p", {
                class: "doc-note",
                children: note
              }, undefined, false, undefined, this),
              /* @__PURE__ */ u3("ul", {
                children: rows.map((r) => /* @__PURE__ */ u3("li", {
                  children: [
                    /* @__PURE__ */ u3("code", {
                      class: "doc-number",
                      children: r.text
                    }, undefined, false, undefined, this),
                    /* @__PURE__ */ u3("span", {
                      class: "doc-lines",
                      children: lineList(r.lines)
                    }, undefined, false, undefined, this),
                    /* @__PURE__ */ u3("div", {
                      class: "doc-source",
                      children: [
                        /* @__PURE__ */ u3("span", {
                          children: [
                            r.reason,
                            r.where ? /* @__PURE__ */ u3(S, {
                              children: [
                                ": ",
                                /* @__PURE__ */ u3("code", {
                                  children: r.where
                                }, undefined, false, undefined, this)
                              ]
                            }, undefined, true, undefined, this) : null
                          ]
                        }, undefined, true, undefined, this),
                        r.by && /* @__PURE__ */ u3("span", {
                          class: "doc-by",
                          children: [
                            /* @__PURE__ */ u3("code", {
                              title: r.by.command,
                              children: r.by.step
                            }, undefined, false, undefined, this),
                            /* @__PURE__ */ u3("span", {
                              children: when(r.by.ts)
                            }, undefined, false, undefined, this)
                          ]
                        }, undefined, true, undefined, this),
                        r.evidence && /* @__PURE__ */ u3("small", {
                          children: r.evidence
                        }, undefined, false, undefined, this)
                      ]
                    }, undefined, true, undefined, this)
                  ]
                }, r.text + r.lines.join(",") + r.reason + (r.evidence ?? ""), true, undefined, this))
              }, undefined, false, undefined, this)
            ]
          }, state, true, undefined, this))
        ]
      }, undefined, true, undefined, this)
    ]
  }, undefined, true, undefined, this);
}
function Printed({ title, rows }) {
  if (!rows.length)
    return null;
  return /* @__PURE__ */ u3("section", {
    class: "results-printed",
    children: [
      /* @__PURE__ */ u3("h3", {
        children: title
      }, undefined, false, undefined, this),
      /* @__PURE__ */ u3("ul", {
        children: rows.map((r) => /* @__PURE__ */ u3("li", {
          children: [
            /* @__PURE__ */ u3("span", {
              children: when(r.ts)
            }, undefined, false, undefined, this),
            /* @__PURE__ */ u3("code", {
              children: r.what
            }, undefined, false, undefined, this),
            /* @__PURE__ */ u3("small", {
              children: r.note
            }, undefined, false, undefined, this)
          ]
        }, r.key, true, undefined, this))
      }, undefined, false, undefined, this)
    ]
  }, undefined, true, undefined, this);
}
var printed = (o) => ({ key: o.ts + o.command, ts: o.ts, what: o.command, note: o.line });
var HUB = [["results", "Results"], ["sources", "Sources"]];
var savedTab = () => {
  try {
    return localStorage.getItem("anvc.results.tab") === "sources" ? "sources" : "results";
  } catch {
    return "results";
  }
};
function ResultsHub() {
  const [tab, setTab] = d2(savedTab);
  const pick = (t) => {
    setTab(t);
    try {
      localStorage.setItem("anvc.results.tab", t);
    } catch {}
  };
  return /* @__PURE__ */ u3("div", {
    class: "project-page",
    children: [
      /* @__PURE__ */ u3("div", {
        class: "filterbar",
        children: [
          /* @__PURE__ */ u3("div", {
            class: "filter-tabs",
            role: "tablist",
            "aria-label": "Results and sources",
            children: HUB.map(([id, label]) => /* @__PURE__ */ u3("button", {
              type: "button",
              role: "tab",
              "aria-selected": tab === id,
              class: tab === id ? "current" : "",
              onClick: () => pick(id),
              children: label
            }, id, false, undefined, this))
          }, undefined, false, undefined, this),
          /* @__PURE__ */ u3("span", {
            class: "project-info",
            children: /* @__PURE__ */ u3(Hint, {
              id: `hub-${tab}`
            }, undefined, false, undefined, this)
          }, undefined, false, undefined, this)
        ]
      }, undefined, true, undefined, this),
      /* @__PURE__ */ u3("div", {
        class: "project-panel",
        role: "tabpanel",
        children: tab === "results" ? /* @__PURE__ */ u3(ResultsPage, {}, undefined, false, undefined, this) : /* @__PURE__ */ u3(SourcesPage, {}, undefined, false, undefined, this)
      }, undefined, false, undefined, this)
    ]
  }, undefined, true, undefined, this);
}
function ResultsPage() {
  const [view, setView] = d2(null);
  const [filter, setFilter] = d2("all");
  const [mode, setMode] = d2("parts");
  const [query, setQuery] = d2("");
  const [found, setFound] = d2(null);
  h2(() => {
    getJson("/api/results").then(setView).catch(() => {});
  }, []);
  h2(() => {
    if (!query.trim()) {
      setFound(null);
      return;
    }
    const t = setTimeout(() => {
      getJson(`/api/whence?q=${encodeURIComponent(query.trim())}`).then(setFound).catch(() => {});
    }, 250);
    return () => clearTimeout(t);
  }, [query]);
  const byId = T2(() => new Map((view?.results ?? []).map((r) => [r.id, r])), [view]);
  const [focus, setFocus] = d2(null);
  if (!view)
    return /* @__PURE__ */ u3("p", {
      class: "map-empty",
      children: "Reading results…"
    }, undefined, false, undefined, this);
  const onDecide = async (body) => {
    const next = await decide(body);
    if (next)
      setView(next);
  };
  const onJump = (id) => {
    setFocus(id);
    setFilter("all");
    setQuery("");
    setMode("parts");
    requestAnimationFrame(() => document.getElementById(`result-${id}`)?.scrollIntoView({ behavior: "smooth", block: "center" }));
  };
  if (view.data.mode === "off") {
    return /* @__PURE__ */ u3("div", {
      class: "results",
      children: /* @__PURE__ */ u3("div", {
        class: "folder-off",
        children: [
          /* @__PURE__ */ u3("p", {
            children: [
              /* @__PURE__ */ u3("b", {
                children: "Keeping track of results is off for this project."
              }, undefined, false, undefined, this),
              " Your agent can't record results here."
            ]
          }, undefined, true, undefined, this),
          /* @__PURE__ */ u3("button", {
            type: "button",
            class: "button",
            onClick: () => void decide({ mode: "results" }).then((v) => v && setView(v)),
            children: "Turn on"
          }, undefined, false, undefined, this)
        ]
      }, undefined, true, undefined, this)
    }, undefined, false, undefined, this);
  }
  const count = (key) => view.results.filter((r) => key === "all" || (key === "look" ? needsLook(r) : r.status === key)).length;
  const listed = (found ? found.results : view.results).filter((r) => filter === "all" || (filter === "look" ? needsLook(r) : r.status === filter));
  const parts = new Map;
  for (const r of listed)
    (parts.get(r.part ?? "") ?? parts.set(r.part ?? "", []).get(r.part ?? "")).push(r);
  return /* @__PURE__ */ u3("div", {
    class: "results",
    children: [
      /* @__PURE__ */ u3("div", {
        class: "filterbar results-bar",
        children: [
          /* @__PURE__ */ u3(Segmented, {
            label: "Filter by status",
            value: filter,
            options: FILTERS.filter(([key]) => key === "all" || count(key) > 0).map(([key, label]) => [key, `${label} ${count(key)}`]),
            onChange: setFilter
          }, undefined, false, undefined, this),
          view.results.length > 0 && /* @__PURE__ */ u3(Segmented, {
            label: "Show",
            value: mode,
            options: [["parts", "By part"], ["timeline", "Timeline"]],
            onChange: setMode
          }, undefined, false, undefined, this),
          /* @__PURE__ */ u3("label", {
            class: "search",
            children: [
              /* @__PURE__ */ u3(Icon, {
                name: "search"
              }, undefined, false, undefined, this),
              /* @__PURE__ */ u3("input", {
                id: "results-search",
                type: "search",
                "aria-label": "Find a number or a result",
                placeholder: "Search results…",
                value: query,
                onInput: (e) => setQuery(e.currentTarget.value)
              }, undefined, false, undefined, this)
            ]
          }, undefined, true, undefined, this)
        ]
      }, undefined, true, undefined, this),
      /* @__PURE__ */ u3(DocumentCheck, {}, undefined, false, undefined, this),
      !view.results.length && !found && /* @__PURE__ */ u3("div", {
        class: "results-empty",
        children: [
          /* @__PURE__ */ u3("h2", {
            children: "No results yet"
          }, undefined, false, undefined, this),
          /* @__PURE__ */ u3("p", {
            children: `When your agent produces a number you'll rely on, it records it here with where it came from. You can also ask it to: "record that as a result".`
          }, undefined, false, undefined, this)
        ]
      }, undefined, true, undefined, this),
      found && /* @__PURE__ */ u3(S, {
        children: [
          /* @__PURE__ */ u3(Printed, {
            title: "In files commands wrote",
            rows: found.files.map((f) => ({
              key: f.path + f.key,
              ts: f.ts,
              what: `${f.path} → ${f.key} = ${f.found}${f.changed ? "  (changed since)" : ""}`,
              note: `written by ${f.command}`
            }))
          }, undefined, false, undefined, this),
          /* @__PURE__ */ u3(Printed, {
            title: "Printed by, oldest first",
            rows: found.outputs.map(printed)
          }, undefined, false, undefined, this),
          /* @__PURE__ */ u3(Printed, {
            title: "In other files",
            rows: found.elsewhere.map((f) => ({
              key: f.path + f.key,
              ts: f.modified,
              what: `${f.path} → ${f.key} = ${f.found}`,
              note: `${f.before ? `changed before ${f.before.command} finished` : "no command in the log named it"}${f.commit ? ` · in commit ${f.commit}` : ""}`
            }))
          }, undefined, false, undefined, this),
          /* @__PURE__ */ u3(Printed, {
            title: "Repeated by",
            rows: found.reads.map(printed)
          }, undefined, false, undefined, this)
        ]
      }, undefined, true, undefined, this),
      found && !found.results.length && !found.outputs.length && !found.reads.length && !found.files.length && !found.elsewhere.length && /* @__PURE__ */ u3("p", {
        class: "settings-sub",
        children: [
          'Nothing recorded holds "',
          query,
          '", and no command here printed it.'
        ]
      }, undefined, true, undefined, this),
      mode === "timeline" && !found && /* @__PURE__ */ u3(Timeline, {
        results: listed,
        byId,
        onJump
      }, undefined, false, undefined, this),
      (mode === "parts" || found) && [...parts.entries()].sort(([a], [b]) => a ? b ? a.localeCompare(b) : -1 : 1).map(([part, list]) => /* @__PURE__ */ u3("section", {
        class: "results-part",
        children: [
          parts.size > 1 || part ? /* @__PURE__ */ u3("h2", {
            class: "part-head",
            children: [
              "Part: ",
              part || "Other",
              /* @__PURE__ */ u3("span", {
                children: [
                  "· ",
                  plural(list.length, "result")
                ]
              }, undefined, true, undefined, this),
              /* @__PURE__ */ u3(Hint, {
                id: "result-part"
              }, undefined, false, undefined, this)
            ]
          }, undefined, true, undefined, this) : null,
          list.map((r) => /* @__PURE__ */ u3(Card, {
            r,
            byId,
            onDecide: (b) => void onDecide(b),
            onJump,
            focus
          }, r.id, false, undefined, this))
        ]
      }, part, true, undefined, this))
    ]
  }, undefined, true, undefined, this);
}
function DataSettings() {
  const [view, setView] = d2(null);
  const [scope, setScope] = d2(null);
  h2(() => {
    getJson("/api/results").then((v) => {
      setView(v);
      setScope(v.data.from === "project" ? "project" : "everywhere");
    }).catch(() => {});
  }, []);
  if (!view || !scope)
    return null;
  const current = scope === "project" ? view.data.mode : view.everywhere;
  const save = async (mode) => {
    const next = await decide({ mode, scope });
    if (next)
      setView(next);
  };
  return /* @__PURE__ */ u3("section", {
    class: "assist",
    children: [
      /* @__PURE__ */ u3("h3", {
        children: "Results"
      }, undefined, false, undefined, this),
      /* @__PURE__ */ u3("p", {
        class: "settings-sub",
        children: "Numbers your project relies on, with where they came from and whether they can still be trusted."
      }, undefined, false, undefined, this),
      /* @__PURE__ */ u3(Scope, {
        scope,
        own: view.data.from === "project",
        onScope: setScope,
        onFollow: () => void decide({ scope: "follow" }).then((v) => {
          if (v) {
            setView(v);
            setScope("everywhere");
          }
        })
      }, undefined, false, undefined, this),
      /* @__PURE__ */ u3("div", {
        class: "presets",
        children: Object.entries(view.modes).map(([key, m]) => /* @__PURE__ */ u3("button", {
          type: "button",
          class: `preset${current === key ? " is-on" : ""}`,
          onClick: () => void save(key),
          children: [
            /* @__PURE__ */ u3("b", {
              children: [
                m.label,
                key === "results" && /* @__PURE__ */ u3("span", {
                  children: "Recommended"
                }, undefined, false, undefined, this)
              ]
            }, undefined, true, undefined, this),
            /* @__PURE__ */ u3("span", {
              children: m.what
            }, undefined, false, undefined, this)
          ]
        }, key, true, undefined, this))
      }, undefined, false, undefined, this)
    ]
  }, undefined, true, undefined, this);
}

// server/absorb.tsx
async function decide2(body) {
  const r = await send("/api/absorb", body);
  return r.ok ? await r.json() : null;
}
function useView() {
  const [view, setView] = d2(null);
  h2(() => {
    getJson("/api/absorb").then(setView).catch(() => {});
  }, []);
  return [view, setView];
}
var tokens = (n) => n.toLocaleString("en");
var TITLE = {
  goals: "Goals aren't updated from your sessions",
  rules: "Writing rules aren't updated from your sessions",
  map: "The map isn't updated from your sessions"
};
function AbsorbNote({ what }) {
  const [view, setView] = useView();
  if (!view)
    return null;
  const { mode, from } = view.setting;
  const choose = (next) => void decide2({ mode: next }).then((v) => v && setView(v));
  if (mode === "off") {
    const runners = Object.entries(view.modes).filter(([key]) => key !== "off" && view.available[key]);
    return /* @__PURE__ */ u3("div", {
      class: "absorb-off",
      children: [
        /* @__PURE__ */ u3("div", {
          class: "absorb-text",
          children: [
            /* @__PURE__ */ u3("p", {
              class: "absorb-title",
              children: /* @__PURE__ */ u3(Hint, {
                id: "absorb",
                children: TITLE[what]
              }, undefined, false, undefined, this)
            }, undefined, false, undefined, this),
            /* @__PURE__ */ u3("p", {
              children: [
                from === "project" ? "It's off for this project. " : from === "everywhere" ? "It's off for every project. " : "It's off. ",
                "When it's on, a small model updates them after your agent's turns. It doesn't use your agent's context."
              ]
            }, undefined, true, undefined, this)
          ]
        }, undefined, true, undefined, this),
        runners.length ? /* @__PURE__ */ u3("div", {
          class: "presets absorb-choices",
          children: runners.map(([key, m]) => /* @__PURE__ */ u3("button", {
            type: "button",
            class: "preset",
            onClick: () => choose(key),
            children: [
              /* @__PURE__ */ u3("b", {
                children: [
                  "Use ",
                  m.label
                ]
              }, undefined, true, undefined, this),
              /* @__PURE__ */ u3("span", {
                class: "preset-cost",
                children: m.tokens
              }, undefined, false, undefined, this)
            ]
          }, key, true, undefined, this))
        }, undefined, false, undefined, this) : /* @__PURE__ */ u3("p", {
          class: "absorb-missing",
          children: "It needs the claude or codex command, and neither is installed here."
        }, undefined, false, undefined, this)
      ]
    }, undefined, true, undefined, this);
  }
  return /* @__PURE__ */ u3("p", {
    class: "absorb-on",
    children: [
      "Kept up to date from your sessions by ",
      view.modes[mode]?.label ?? mode,
      view.last ? ` · last updated ${when(view.last.ran)} · ${tokens(view.last.tokens)} tokens over ${view.last.runs} update${view.last.runs === 1 ? "" : "s"}` : " · no update yet",
      /* @__PURE__ */ u3("button", {
        type: "button",
        class: "link-button",
        onClick: () => choose("off"),
        children: "Turn off"
      }, undefined, false, undefined, this)
    ]
  }, undefined, true, undefined, this);
}
function AbsorbSettings() {
  const [view, setView] = useView();
  const [scope, setScope] = d2(null);
  h2(() => {
    if (view && !scope)
      setScope(view.setting.from === "project" ? "project" : "everywhere");
  }, [view]);
  if (!view || !scope)
    return null;
  const current = scope === "project" ? view.setting.mode : view.everywhere;
  const save = async (mode) => {
    const next = await decide2({ mode, scope });
    if (next)
      setView(next);
  };
  return /* @__PURE__ */ u3("section", {
    class: "assist",
    children: [
      /* @__PURE__ */ u3("h3", {
        children: "Goals, writing rules and map from your sessions"
      }, undefined, false, undefined, this),
      /* @__PURE__ */ u3("p", {
        class: "settings-sub",
        children: /* @__PURE__ */ u3(Hint, {
          id: "absorb",
          children: "A small model keeps them up to date for you to see, outside the session."
        }, undefined, false, undefined, this)
      }, undefined, false, undefined, this),
      /* @__PURE__ */ u3(Scope, {
        scope,
        own: view.setting.from === "project",
        onScope: setScope,
        onFollow: () => void decide2({ scope: "follow" }).then((v) => {
          if (v) {
            setView(v);
            setScope("everywhere");
          }
        })
      }, undefined, false, undefined, this),
      /* @__PURE__ */ u3("div", {
        class: "presets",
        children: Object.entries(view.modes).map(([key, m]) => {
          const missing = key !== "off" && !view.available[key];
          return /* @__PURE__ */ u3("button", {
            type: "button",
            class: `preset${current === key ? " is-on" : ""}`,
            disabled: missing,
            onClick: () => void save(key),
            children: [
              /* @__PURE__ */ u3("b", {
                children: m.label
              }, undefined, false, undefined, this),
              /* @__PURE__ */ u3("span", {
                children: missing ? `Needs the ${key} command, which isn't installed here.` : m.what
              }, undefined, false, undefined, this),
              !missing && m.tokens && /* @__PURE__ */ u3("span", {
                class: "preset-cost",
                children: m.tokens
              }, undefined, false, undefined, this)
            ]
          }, key, true, undefined, this);
        })
      }, undefined, false, undefined, this)
    ]
  }, undefined, true, undefined, this);
}

// server/folders.tsx
async function post(body) {
  const r = await send("/api/folders", body);
  return r.ok ? await r.json() : null;
}
function useFolders() {
  const [data, setData] = d2(null);
  const load = () => getJson("/api/folders").then(setData).catch(() => {});
  h2(() => {
    load();
    const timer = setInterval(load, 1e4);
    return () => clearInterval(timer);
  }, []);
  const set = async (repo, on) => {
    if (data)
      setData({ ...data, folders: data.folders.map((f) => f.repo === repo ? { ...f, on } : f) });
    const next = await post({ repo, on });
    if (next)
      setData(next);
  };
  const open = async (repo) => {
    if (await post({ repo, open: true }))
      location.reload();
  };
  const here = data?.folders.find((f) => f.repo === data.current) ?? null;
  return { data, here, set, open };
}
var name = (repo) => repo.split(/[\\/]/).filter(Boolean).at(-1) ?? repo;
function Toggle({ on, label, onChange }) {
  return /* @__PURE__ */ u3("button", {
    role: "switch",
    "aria-checked": on,
    "aria-label": label,
    class: `folder-toggle${on ? " is-on" : ""}`,
    onClick: () => onChange(!on),
    children: [
      /* @__PURE__ */ u3("span", {
        class: "folder-toggle-track",
        children: /* @__PURE__ */ u3("span", {
          class: "folder-toggle-knob"
        }, undefined, false, undefined, this)
      }, undefined, false, undefined, this),
      /* @__PURE__ */ u3("span", {
        children: on ? "On" : "Off"
      }, undefined, false, undefined, this)
    ]
  }, undefined, true, undefined, this);
}
function FolderSwitch({ folders }) {
  const { here, set, data } = folders;
  if (!here)
    return null;
  return /* @__PURE__ */ u3("div", {
    class: "folder-switch",
    children: [
      data?.local && /* @__PURE__ */ u3("span", {
        class: "local-tag",
        title: "Everything ANVC keeps here stays on this computer. Change it in Settings.",
        children: "Local only"
      }, undefined, false, undefined, this),
      /* @__PURE__ */ u3("span", {
        children: "ANVC for this project"
      }, undefined, false, undefined, this),
      /* @__PURE__ */ u3(Toggle, {
        on: here.on,
        label: "ANVC for this project",
        onChange: (on) => void set(here.repo, on)
      }, undefined, false, undefined, this)
    ]
  }, undefined, true, undefined, this);
}
function OffBanner({ folders }) {
  const { here, set } = folders;
  if (!here || here.on)
    return null;
  return /* @__PURE__ */ u3("div", {
    class: "folder-off",
    role: "status",
    children: [
      /* @__PURE__ */ u3("p", {
        children: [
          /* @__PURE__ */ u3("b", {
            children: "ANVC is off for this project."
          }, undefined, false, undefined, this),
          " Nothing is saved here or shown to agents."
        ]
      }, undefined, true, undefined, this),
      /* @__PURE__ */ u3("button", {
        class: "button",
        onClick: () => void set(here.repo, true),
        children: "Turn on"
      }, undefined, false, undefined, this)
    ]
  }, undefined, true, undefined, this);
}
var said = (names, type = "conjunction") => new Intl.ListFormat("en-GB", { type }).format(names);
var OFFLINE = "Couldn't reach the ANVC server";
function useFound() {
  const [data, setData] = d2(null);
  const [error, setError] = d2("");
  const answer = async (r) => {
    const out = await r.then((res) => res.json()).catch(() => ({ error: OFFLINE }));
    if (out.error) {
      setError(out.error);
      return false;
    }
    setError("");
    setData(out);
    return true;
  };
  const load = () => answer(fetch("/api/folders/found"));
  h2(() => {
    load();
  }, []);
  const set = (repo, on) => {
    if (data)
      setData({ ...data, found: data.found.map((f) => f.repo === repo ? { ...f, on } : f) });
    return answer(send("/api/folders/found", { repo, on }));
  };
  const add = (folder) => answer(send("/api/folders/found", { add: folder }));
  return { data, error, load, set, add };
}
function Preview({ target, ask, action, onDone, onCancel }) {
  const [plan, setPlan] = d2(null);
  const [busy, setBusy] = d2(false);
  const query = new URLSearchParams(target).toString();
  h2(() => {
    getJson(`/api/folders/setup?${query}`).then(setPlan).catch(() => setPlan({ error: OFFLINE }));
  }, [query]);
  const run = async () => {
    setBusy(true);
    const out = await (await send("/api/folders/setup", target)).json().catch(() => ({ error: OFFLINE }));
    setBusy(false);
    if (out.error)
      setPlan({ ...plan, error: out.error });
    else
      onDone(out.output ?? "");
  };
  const changes = plan?.changes ?? [];
  const removing = "everywhere" in target && target.everywhere === "remove";
  return /* @__PURE__ */ u3("div", {
    class: "folder-plan",
    "aria-live": "polite",
    children: [
      !plan ? /* @__PURE__ */ u3("p", {
        children: "Checking what this changes…"
      }, undefined, false, undefined, this) : plan.error ? /* @__PURE__ */ u3("p", {
        class: "is-error",
        children: plan.error
      }, undefined, false, undefined, this) : /* @__PURE__ */ u3(S, {
        children: [
          /* @__PURE__ */ u3("p", {
            children: [
              ask,
              " ",
              !changes.length ? "There's nothing to change." : removing ? "This takes out:" : "This changes:"
            ]
          }, undefined, true, undefined, this),
          changes.length > 0 && /* @__PURE__ */ u3("ul", {
            children: changes.map((c) => {
              const at = c.indexOf(": ");
              return /* @__PURE__ */ u3("li", {
                children: at > 0 ? /* @__PURE__ */ u3(S, {
                  children: [
                    /* @__PURE__ */ u3("code", {
                      children: c.slice(0, at)
                    }, undefined, false, undefined, this),
                    " ",
                    c.slice(at + 2)
                  ]
                }, undefined, true, undefined, this) : c
              }, c, false, undefined, this);
            })
          }, undefined, false, undefined, this),
          plan.kept?.map((k) => /* @__PURE__ */ u3("p", {
            class: "folder-kept",
            children: [
              "Kept: ",
              k
            ]
          }, k, true, undefined, this))
        ]
      }, undefined, true, undefined, this),
      /* @__PURE__ */ u3("div", {
        children: [
          changes.length > 0 && !plan?.error && /* @__PURE__ */ u3("button", {
            class: "button primary",
            disabled: busy,
            onClick: () => void run(),
            children: busy ? "Working…" : action
          }, undefined, false, undefined, this),
          /* @__PURE__ */ u3("button", {
            class: "button",
            onClick: onCancel,
            children: "Cancel"
          }, undefined, false, undefined, this)
        ]
      }, undefined, true, undefined, this)
    ]
  }, undefined, true, undefined, this);
}
function Result({ done, at }) {
  if (done?.key !== at)
    return null;
  return /* @__PURE__ */ u3("details", {
    class: "folder-result",
    open: true,
    children: [
      /* @__PURE__ */ u3("summary", {
        children: done.title
      }, undefined, false, undefined, this),
      /* @__PURE__ */ u3("pre", {
        children: done.output
      }, undefined, false, undefined, this)
    ]
  }, undefined, true, undefined, this);
}
function EveryProject({ data, done, onDone }) {
  const [asking, setAsking] = d2(false);
  const on = data.everywhere.length > 0;
  return /* @__PURE__ */ u3("section", {
    class: "folder-every",
    children: [
      /* @__PURE__ */ u3("div", {
        class: "folder-every-head",
        children: [
          /* @__PURE__ */ u3("p", {
            children: on ? `ANVC runs in every project ${said(data.everywhere, "disjunction")} opens.` : "ANVC is set up one project at a time."
          }, undefined, false, undefined, this),
          !asking && (on || data.setup) && /* @__PURE__ */ u3("button", {
            class: "button",
            onClick: () => setAsking(true),
            children: on ? "Remove" : "Install for every project"
          }, undefined, false, undefined, this)
        ]
      }, undefined, true, undefined, this),
      !on && !data.setup && /* @__PURE__ */ u3(S, {
        children: [
          /* @__PURE__ */ u3("p", {
            children: "To install it for every project, run this in your ANVC folder:"
          }, undefined, false, undefined, this),
          /* @__PURE__ */ u3(Copy, {
            text: data.commands.everywhere
          }, undefined, false, undefined, this)
        ]
      }, undefined, true, undefined, this),
      asking && /* @__PURE__ */ u3(Preview, {
        target: { everywhere: on ? "remove" : "install" },
        ask: on ? "Remove ANVC from every project?" : `Install ANVC in every project ${said(data.agents, "disjunction")} opens?`,
        action: on ? "Remove" : "Install",
        onCancel: () => setAsking(false),
        onDone: (output) => {
          setAsking(false);
          onDone({ key: "everywhere", title: on ? "ANVC is removed from every project" : "ANVC is installed for every project", output });
        }
      }, undefined, false, undefined, this),
      /* @__PURE__ */ u3(Result, {
        done,
        at: "everywhere"
      }, undefined, false, undefined, this)
    ]
  }, undefined, true, undefined, this);
}
function Found({ found, done, onDone }) {
  const { data, set, add } = found;
  const [typed, setTyped] = d2("");
  const [asking, setAsking] = d2(null);
  if (!data)
    return null;
  const copy = !data.setup && data.found.some((f) => f.state === "none");
  return /* @__PURE__ */ u3("section", {
    class: "folder-found",
    children: [
      /* @__PURE__ */ u3("h3", {
        children: "Other repositories"
      }, undefined, false, undefined, this),
      /* @__PURE__ */ u3("p", {
        class: "folder-sub",
        children: [
          data.searched.length ? `Looked in ${said(data.searched)}.` : "Add a folder to look in.",
          data.stopped && " Stopped early, so some may be missing.",
          copy && " To set one up, run its command in your ANVC folder."
        ]
      }, undefined, true, undefined, this),
      data.found.length > 0 && /* @__PURE__ */ u3("ul", {
        class: "folder-list",
        children: data.found.map((f) => /* @__PURE__ */ u3("li", {
          class: `folder-row${f.state !== "none" && !f.on ? " is-off" : ""}`,
          children: [
            /* @__PURE__ */ u3(Icon, {
              name: "folder",
              size: 20
            }, undefined, false, undefined, this),
            /* @__PURE__ */ u3("div", {
              class: "folder-name",
              children: [
                /* @__PURE__ */ u3("strong", {
                  children: name(f.repo)
                }, undefined, false, undefined, this),
                /* @__PURE__ */ u3("small", {
                  children: f.repo
                }, undefined, false, undefined, this),
                f.state === "none" && !data.setup && /* @__PURE__ */ u3("code", {
                  children: f.command
                }, undefined, false, undefined, this)
              ]
            }, undefined, true, undefined, this),
            f.state !== "none" ? /* @__PURE__ */ u3(Toggle, {
              on: f.on,
              label: `ANVC for ${name(f.repo)}`,
              onChange: (on) => void set(f.repo, on)
            }, undefined, false, undefined, this) : !data.setup ? /* @__PURE__ */ u3(CopyButton, {
              text: f.command
            }, undefined, false, undefined, this) : asking !== f.repo && /* @__PURE__ */ u3("button", {
              class: "button",
              onClick: () => setAsking(f.repo),
              children: "Set up"
            }, undefined, false, undefined, this),
            asking === f.repo && /* @__PURE__ */ u3(Preview, {
              target: { repo: f.repo },
              ask: `Set up ANVC in ${name(f.repo)} for ${said(data.agents)}?`,
              action: "Set up",
              onCancel: () => setAsking(null),
              onDone: (output) => {
                setAsking(null);
                onDone({ key: f.repo, title: `${name(f.repo)} is set up`, output });
              }
            }, undefined, false, undefined, this),
            /* @__PURE__ */ u3(Result, {
              done,
              at: f.repo
            }, undefined, false, undefined, this)
          ]
        }, f.repo, true, undefined, this))
      }, undefined, false, undefined, this),
      /* @__PURE__ */ u3("form", {
        class: "folder-add",
        onSubmit: (e) => {
          e.preventDefault();
          add(typed).then((ok) => ok && setTyped(""));
        },
        children: [
          /* @__PURE__ */ u3("input", {
            value: typed,
            placeholder: "~/code",
            "aria-label": "Folder to look in",
            onInput: (e) => setTyped(e.currentTarget.value)
          }, undefined, false, undefined, this),
          /* @__PURE__ */ u3("button", {
            type: "submit",
            class: "button",
            disabled: !typed.trim(),
            children: "Add folder"
          }, undefined, false, undefined, this)
        ]
      }, undefined, true, undefined, this)
    ]
  }, undefined, true, undefined, this);
}
function FoldersPage({ folders }) {
  const { data, set, open } = folders;
  const found = useFound();
  const [done, setDone] = d2(null);
  const finished = (d) => {
    setDone(d);
    found.load();
  };
  if (!data)
    return /* @__PURE__ */ u3("p", {
      class: "map-empty",
      children: "Loading folders…"
    }, undefined, false, undefined, this);
  return /* @__PURE__ */ u3("div", {
    class: "folders",
    children: [
      found.data && /* @__PURE__ */ u3(EveryProject, {
        data: found.data,
        done,
        onDone: finished
      }, undefined, false, undefined, this),
      /* @__PURE__ */ u3("ul", {
        class: "folder-list",
        children: data.folders.map((f) => /* @__PURE__ */ u3("li", {
          class: `folder-row${f.on ? "" : " is-off"}`,
          children: [
            /* @__PURE__ */ u3(Icon, {
              name: "folder",
              size: 20
            }, undefined, false, undefined, this),
            /* @__PURE__ */ u3("div", {
              class: "folder-name",
              children: [
                /* @__PURE__ */ u3("strong", {
                  children: name(f.repo)
                }, undefined, false, undefined, this),
                /* @__PURE__ */ u3("small", {
                  children: f.repo
                }, undefined, false, undefined, this)
              ]
            }, undefined, true, undefined, this),
            /* @__PURE__ */ u3("small", {
              class: "folder-seen",
              children: f.repo === data.current ? "Open now" : `Used ${f.seen.slice(0, 10)}`
            }, undefined, false, undefined, this),
            f.repo !== data.current && /* @__PURE__ */ u3("button", {
              class: "button",
              onClick: () => void open(f.repo),
              children: "Open"
            }, undefined, false, undefined, this),
            /* @__PURE__ */ u3(Toggle, {
              on: f.on,
              label: `ANVC for ${name(f.repo)}`,
              onChange: (next) => void set(f.repo, next)
            }, undefined, false, undefined, this)
          ]
        }, f.repo, true, undefined, this))
      }, undefined, false, undefined, this),
      !found.data && !found.error && /* @__PURE__ */ u3("p", {
        class: "folder-sub folder-looking",
        children: "Looking for other repositories…"
      }, undefined, false, undefined, this),
      /* @__PURE__ */ u3(Found, {
        found,
        done,
        onDone: finished
      }, undefined, false, undefined, this),
      found.error && /* @__PURE__ */ u3("p", {
        class: "settings-status is-error",
        role: "status",
        children: found.error
      }, undefined, false, undefined, this)
    ]
  }, undefined, true, undefined, this);
}

// server/assist.tsx
async function saveAssist(body) {
  const r = await send("/api/assist", body);
  return r.ok ? await r.json() : null;
}
var loadAssist = () => getJson("/api/assist");
function AssistLevels({ view, current, edited, onPick }) {
  return /* @__PURE__ */ u3("div", {
    class: "presets",
    children: Object.keys(view.levels).map((key) => /* @__PURE__ */ u3("button", {
      type: "button",
      class: `preset${current === key ? " is-on" : ""}`,
      onClick: () => onPick(key),
      children: [
        /* @__PURE__ */ u3("b", {
          children: [
            view.levels[key].label,
            key === "auto" && /* @__PURE__ */ u3("span", {
              children: "Recommended"
            }, undefined, false, undefined, this),
            current === key && edited && /* @__PURE__ */ u3("span", {
              children: "edited"
            }, undefined, false, undefined, this)
          ]
        }, undefined, true, undefined, this),
        /* @__PURE__ */ u3("span", {
          children: view.levels[key].what
        }, undefined, false, undefined, this)
      ]
    }, key, true, undefined, this))
  }, undefined, false, undefined, this);
}
function AssistSettings() {
  const [view, setView] = d2(null);
  const [scope, setScope] = d2(null);
  h2(() => {
    loadAssist().then((v) => {
      setView(v);
      setScope(v.project.from === "project" ? "project" : "everywhere");
    });
  }, []);
  if (!view || !scope)
    return null;
  const shown = scope === "project" ? view.project : view.everywhere;
  const edited = Object.entries(shown.moments).some(([k, v]) => view.levels[shown.level].moments[k] !== v);
  const save = async (change) => {
    const next = await saveAssist({ scope, ...change });
    if (next)
      setView(next);
  };
  return /* @__PURE__ */ u3("section", {
    class: "assist",
    children: [
      /* @__PURE__ */ u3("h3", {
        children: "Your agent"
      }, undefined, false, undefined, this),
      /* @__PURE__ */ u3("p", {
        class: "settings-sub",
        children: "What ANVC tells your agent without being asked. You can always ask it to check ANVC yourself."
      }, undefined, false, undefined, this),
      /* @__PURE__ */ u3(Scope, {
        scope,
        own: view.project.from === "project",
        onScope: setScope,
        onFollow: () => void saveAssist({ clear: true }).then((v) => {
          if (v) {
            setView(v);
            setScope("everywhere");
          }
        })
      }, undefined, false, undefined, this),
      /* @__PURE__ */ u3(AssistLevels, {
        view,
        current: shown.level,
        edited,
        onPick: (level) => void save({ level })
      }, undefined, false, undefined, this),
      /* @__PURE__ */ u3("div", {
        class: "fields",
        children: Object.entries(view.moments).map(([key, meta]) => /* @__PURE__ */ u3("div", {
          class: "field-row",
          children: [
            /* @__PURE__ */ u3("div", {
              children: [
                /* @__PURE__ */ u3("b", {
                  children: meta.label
                }, undefined, false, undefined, this),
                /* @__PURE__ */ u3("span", {
                  children: meta.what
                }, undefined, false, undefined, this)
              ]
            }, undefined, true, undefined, this),
            /* @__PURE__ */ u3(Toggle, {
              on: shown.moments[key],
              label: meta.label,
              onChange: (on) => void save({ moment: key, on })
            }, undefined, false, undefined, this)
          ]
        }, key, true, undefined, this))
      }, undefined, false, undefined, this)
    ]
  }, undefined, true, undefined, this);
}

// server/install.tsx
var asked = null;
function useInstall() {
  const [install, setInstall] = d2(null);
  h2(() => {
    (asked ??= getJson("/api/version")).then(setInstall).catch(() => {
      asked = null;
    });
  }, []);
  return install;
}
var SLASH = ["init", "on", "off", "open"];
var anvc = (i, args) => i.managed === "plugin" && SLASH.includes(args) ? `/anvc:${args}` : `${i.cli} ${args} ${i.repo}`;

// server/settings.tsx
var RETIRE = [
  ["auto", "Auto", "The agent can retire a record when ANVC can confirm why, such as its files being gone. Anything else waits for you."],
  ["ask", "Ask", "The agent asks you first."],
  ["off", "Off", "Records are never retired."]
];
var REASON = {
  replaced: "Replaced",
  "files-gone": "Files gone",
  "recheck-passes": "Passes now",
  wrong: "Wrong"
};
function Retirements() {
  const [data, setData] = d2(null);
  const [error, setError] = d2("");
  const load = () => getJson("/api/retirements").then(setData).catch(() => setError("Couldn't load retirements"));
  h2(() => {
    load();
  }, []);
  const answer = async (target, decision) => {
    const r = await send("/api/retirements", { target, decision });
    const out = await r.json();
    if (!r.ok || out.error) {
      setError(out.error ?? "Couldn't save");
      return;
    }
    setError("");
    setData(out);
  };
  if (!data || !data.pending.length && !data.retired.length)
    return error ? /* @__PURE__ */ u3("p", {
      class: "settings-status is-error",
      children: error
    }, undefined, false, undefined, this) : null;
  const row = (item, actions) => /* @__PURE__ */ u3("div", {
    class: "field-row",
    children: [
      /* @__PURE__ */ u3("div", {
        children: [
          /* @__PURE__ */ u3("b", {
            children: item.targetIntent || item.target
          }, undefined, false, undefined, this),
          /* @__PURE__ */ u3("span", {
            children: [
              REASON[item.reason] ?? item.reason,
              ": ",
              item.evidence.replace(/\s+/g, " ").slice(0, 160)
            ]
          }, undefined, true, undefined, this)
        ]
      }, undefined, true, undefined, this),
      /* @__PURE__ */ u3("div", {
        class: "retire-actions",
        children: actions.map(([label, decision]) => /* @__PURE__ */ u3("button", {
          type: "button",
          class: decision === "retire" ? "button primary" : "button",
          onClick: () => void answer(item.target, decision),
          children: label
        }, decision, false, undefined, this))
      }, undefined, false, undefined, this)
    ]
  }, item.id, true, undefined, this);
  return /* @__PURE__ */ u3(S, {
    children: [
      data.pending.length > 0 && /* @__PURE__ */ u3(S, {
        children: [
          /* @__PURE__ */ u3("h3", {
            children: "Waiting for you"
          }, undefined, false, undefined, this),
          /* @__PURE__ */ u3("div", {
            class: "fields",
            children: data.pending.map((p) => row(p, [["Retire", "retire"], ["Keep", "decline"]]))
          }, undefined, false, undefined, this)
        ]
      }, undefined, true, undefined, this),
      data.retired.length > 0 && /* @__PURE__ */ u3(S, {
        children: [
          /* @__PURE__ */ u3("h3", {
            children: "Retired"
          }, undefined, false, undefined, this),
          /* @__PURE__ */ u3("div", {
            class: "fields",
            children: data.retired.map((p) => row(p, [["Restore", "restore"]]))
          }, undefined, false, undefined, this)
        ]
      }, undefined, true, undefined, this),
      error && /* @__PURE__ */ u3("p", {
        class: "settings-status is-error",
        children: error
      }, undefined, false, undefined, this)
    ]
  }, undefined, true, undefined, this);
}
function LocalOnly({ on, onChange }) {
  const [asking, setAsking] = d2(false);
  return /* @__PURE__ */ u3("section", {
    class: `local-only${on ? " is-on" : ""}`,
    children: [
      /* @__PURE__ */ u3("div", {
        class: "local-head",
        children: [
          /* @__PURE__ */ u3("div", {
            children: [
              /* @__PURE__ */ u3("h3", {
                children: "Local only"
              }, undefined, false, undefined, this),
              /* @__PURE__ */ u3("p", {
                children: on ? "Everything ANVC keeps for this repository stays on this computer: git push and git fetch don't carry records, and every record is private." : "Turn this on if the repository has no remote, or records should never leave this computer."
              }, undefined, false, undefined, this)
            ]
          }, undefined, true, undefined, this),
          !asking && /* @__PURE__ */ u3("button", {
            class: "button",
            onClick: () => setAsking(true),
            children: on ? "Turn off" : "Turn on"
          }, undefined, false, undefined, this)
        ]
      }, undefined, true, undefined, this),
      asking && /* @__PURE__ */ u3("div", {
        class: "local-confirm",
        role: "alert",
        children: [
          /* @__PURE__ */ u3("p", {
            children: on ? "Turn off local only? Nothing is sent now. Records made while it was on stay private. To share new records, turn on git push below." : "Turn on local only? ANVC stops pushing and fetching records here and makes every new record private. Records already on a remote stay there."
          }, undefined, false, undefined, this),
          /* @__PURE__ */ u3("div", {
            children: [
              /* @__PURE__ */ u3("button", {
                class: "button primary",
                onClick: () => {
                  setAsking(false);
                  onChange(!on);
                },
                children: on ? "Turn off local only" : "Turn on local only"
              }, undefined, false, undefined, this),
              /* @__PURE__ */ u3("button", {
                class: "button",
                onClick: () => setAsking(false),
                children: "Cancel"
              }, undefined, false, undefined, this)
            ]
          }, undefined, true, undefined, this)
        ]
      }, undefined, true, undefined, this)
    ]
  }, undefined, true, undefined, this);
}
function RemoveAnvc() {
  const [plan, setPlan] = d2(null);
  const [asking, setAsking] = d2(false);
  const [remotes, setRemotes] = d2([]);
  const [typed, setTyped] = d2("");
  const [busy, setBusy] = d2(false);
  const [done, setDone] = d2(null);
  const [restored, setRestored] = d2(null);
  const [list, setList] = d2(null);
  const [error, setError] = d2("");
  const install = useInstall();
  const loadList = () => void getJson("/api/restore").then((d) => setList(d.backups ?? []));
  h2(loadList, []);
  const ask = async () => {
    setAsking(true);
    setPlan(null);
    setRemotes([]);
    setTyped("");
    setError("");
    setDone(null);
    const p = await getJson("/api/remove");
    if (p.error)
      setError(p.error);
    else
      setPlan(p);
  };
  const names = remotes.join(", ");
  const removeNow = async () => {
    setBusy(true);
    const r = await send("/api/remove", { remotes, confirm: typed.trim() });
    const out = await r.json();
    setBusy(false);
    if (!r.ok || out.error) {
      setError(out.error ?? "Couldn't remove ANVC");
      return;
    }
    setAsking(false);
    setDone({
      file: out.file,
      deleted: [
        `Deleted ${out.here} in this clone`,
        ...out.remotes.map((x) => x.error ? `Deleted ${x.deleted} on ${x.remote}, then it failed: ${x.error}` : `Deleted ${x.deleted} on ${x.remote}`)
      ],
      removed: out.uninstalled?.removed ?? []
    });
    loadList();
  };
  const restoreOne = async (file) => {
    const r = await send("/api/restore", { file });
    const out = await r.json();
    if (!r.ok || out.error) {
      setError(out.error ?? "Couldn't restore");
      return;
    }
    const x = out.restored;
    setError("");
    setList(out.backups);
    setRestored({
      lines: [
        `Restored ${x.added}${x.settings.length ? `, with ${plural(x.settings.length, "settings file")}` : ""}`,
        ...x.kept.length ? [`Kept ${x.kept.length} that changed after the backup as ${x.kept.length === 1 ? "it is" : "they are"} here: ${x.kept.slice(0, 3).join(", ")}${x.kept.length > 3 ? " and more" : ""}`] : []
      ],
      commands: [
        ...x.off && install ? [["ANVC is off in this folder. This puts back what setup changed:", anvc(install, `restore "${x.file}" --setup`)]] : [],
        ...x.pushBack.map((c) => ["To put the records back on the remote:", c])
      ]
    });
  };
  return /* @__PURE__ */ u3(S, {
    children: [
      /* @__PURE__ */ u3("section", {
        class: "local-only remove-anvc",
        children: [
          /* @__PURE__ */ u3("div", {
            class: "local-head",
            children: [
              /* @__PURE__ */ u3("div", {
                children: [
                  /* @__PURE__ */ u3("h3", {
                    children: "Remove ANVC"
                  }, undefined, false, undefined, this),
                  /* @__PURE__ */ u3("p", {
                    children: "Backs up this project's records and settings to a file, then deletes them and takes out what setup added."
                  }, undefined, false, undefined, this)
                ]
              }, undefined, true, undefined, this),
              !asking && /* @__PURE__ */ u3("button", {
                class: "button",
                onClick: () => void ask(),
                children: "Remove…"
              }, undefined, false, undefined, this)
            ]
          }, undefined, true, undefined, this),
          asking && /* @__PURE__ */ u3("div", {
            class: "local-confirm",
            role: "alert",
            children: !plan ? /* @__PURE__ */ u3("p", {
              children: error || "Checking this project and its remotes…"
            }, undefined, false, undefined, this) : /* @__PURE__ */ u3(S, {
              children: [
                /* @__PURE__ */ u3("ul", {
                  class: "remove-steps",
                  children: [
                    /* @__PURE__ */ u3("li", {
                      children: [
                        "Back up ",
                        plan.says,
                        ", with this project's settings, to ",
                        plan.dir
                      ]
                    }, undefined, true, undefined, this),
                    plan.here > 0 && /* @__PURE__ */ u3("li", {
                      children: [
                        "Delete ",
                        plan.says,
                        " in this clone"
                      ]
                    }, undefined, true, undefined, this),
                    plan.setup.map((line) => /* @__PURE__ */ u3("li", {
                      children: line
                    }, line, false, undefined, this))
                  ]
                }, undefined, true, undefined, this),
                plan.remotes.map((r) => r.refs === null ? /* @__PURE__ */ u3("p", {
                  class: "remove-note",
                  children: [
                    "Couldn't check ",
                    r.remote,
                    ": ",
                    r.says.replace(/^couldn't reach it: /, "")
                  ]
                }, r.remote, true, undefined, this) : /* @__PURE__ */ u3("label", {
                  class: "remove-remote",
                  children: [
                    /* @__PURE__ */ u3("input", {
                      type: "checkbox",
                      checked: remotes.includes(r.remote),
                      onChange: (e) => setRemotes(e.currentTarget.checked ? [...remotes, r.remote] : remotes.filter((n) => n !== r.remote))
                    }, undefined, false, undefined, this),
                    /* @__PURE__ */ u3("span", {
                      children: [
                        "Also delete ",
                        r.says,
                        " on ",
                        r.remote,
                        " ",
                        /* @__PURE__ */ u3("small", {
                          children: r.url
                        }, undefined, false, undefined, this)
                      ]
                    }, undefined, true, undefined, this)
                  ]
                }, r.remote, true, undefined, this)),
                remotes.length > 0 && /* @__PURE__ */ u3(S, {
                  children: [
                    /* @__PURE__ */ u3("p", {
                      class: "remove-note",
                      children: "Anyone who already fetched them keeps their copy."
                    }, undefined, false, undefined, this),
                    /* @__PURE__ */ u3("label", {
                      class: "remove-type",
                      children: [
                        "Type ",
                        names,
                        " to confirm",
                        /* @__PURE__ */ u3("input", {
                          type: "text",
                          value: typed,
                          autocomplete: "off",
                          spellcheck: false,
                          onInput: (e) => setTyped(e.currentTarget.value)
                        }, undefined, false, undefined, this)
                      ]
                    }, undefined, true, undefined, this)
                  ]
                }, undefined, true, undefined, this),
                error && /* @__PURE__ */ u3("p", {
                  class: "remove-note is-error",
                  children: error
                }, undefined, false, undefined, this),
                /* @__PURE__ */ u3("div", {
                  children: [
                    /* @__PURE__ */ u3("button", {
                      class: "button primary",
                      disabled: busy || remotes.length > 0 && typed.trim() !== names,
                      onClick: () => void removeNow(),
                      children: busy ? "Removing…" : "Back up and remove"
                    }, undefined, false, undefined, this),
                    /* @__PURE__ */ u3("button", {
                      class: "button",
                      onClick: () => setAsking(false),
                      children: "Cancel"
                    }, undefined, false, undefined, this)
                  ]
                }, undefined, true, undefined, this)
              ]
            }, undefined, true, undefined, this)
          }, undefined, false, undefined, this),
          done && /* @__PURE__ */ u3("div", {
            class: "local-confirm",
            role: "status",
            children: [
              /* @__PURE__ */ u3("p", {
                children: [
                  "Backed up to ",
                  /* @__PURE__ */ u3("code", {
                    children: done.file
                  }, undefined, false, undefined, this)
                ]
              }, undefined, true, undefined, this),
              /* @__PURE__ */ u3("ul", {
                class: "remove-steps",
                children: done.deleted.map((line) => /* @__PURE__ */ u3("li", {
                  children: line
                }, line, false, undefined, this))
              }, undefined, false, undefined, this),
              done.removed.length > 0 && /* @__PURE__ */ u3(S, {
                children: [
                  /* @__PURE__ */ u3("p", {
                    children: "Removed from this project:"
                  }, undefined, false, undefined, this),
                  /* @__PURE__ */ u3("ul", {
                    class: "remove-steps",
                    children: done.removed.map((line) => /* @__PURE__ */ u3("li", {
                      children: line
                    }, line, false, undefined, this))
                  }, undefined, false, undefined, this)
                ]
              }, undefined, true, undefined, this)
            ]
          }, undefined, true, undefined, this)
        ]
      }, undefined, true, undefined, this),
      /* @__PURE__ */ u3("h3", {
        children: "Restore"
      }, undefined, false, undefined, this),
      list && !list.length && /* @__PURE__ */ u3("p", {
        class: "settings-sub",
        children: "No backups of this project."
      }, undefined, false, undefined, this),
      list && list.length > 0 && /* @__PURE__ */ u3("div", {
        class: "fields",
        children: list.map((b) => /* @__PURE__ */ u3("div", {
          class: "field-row",
          children: [
            /* @__PURE__ */ u3("div", {
              children: [
                /* @__PURE__ */ u3("b", {
                  children: new Date(b.created).toLocaleString()
                }, undefined, false, undefined, this),
                /* @__PURE__ */ u3("span", {
                  children: [
                    b.says,
                    " · ",
                    b.name
                  ]
                }, undefined, true, undefined, this)
              ]
            }, undefined, true, undefined, this),
            /* @__PURE__ */ u3("button", {
              type: "button",
              class: "button",
              onClick: () => void restoreOne(b.file),
              children: "Restore"
            }, undefined, false, undefined, this)
          ]
        }, b.file, true, undefined, this))
      }, undefined, false, undefined, this),
      !asking && error && /* @__PURE__ */ u3("p", {
        class: "remove-note is-error",
        children: error
      }, undefined, false, undefined, this),
      restored && /* @__PURE__ */ u3("div", {
        class: "remove-restored",
        role: "status",
        children: [
          restored.lines.map((line) => /* @__PURE__ */ u3("p", {
            children: line
          }, line, false, undefined, this)),
          restored.commands.map(([label, c]) => /* @__PURE__ */ u3(S, {
            children: [
              /* @__PURE__ */ u3("p", {
                class: "remove-note",
                children: label
              }, undefined, false, undefined, this),
              /* @__PURE__ */ u3("div", {
                class: "policy-line",
                children: [
                  /* @__PURE__ */ u3("code", {
                    children: c
                  }, undefined, false, undefined, this),
                  /* @__PURE__ */ u3(CopyButton, {
                    text: c
                  }, undefined, false, undefined, this)
                ]
              }, undefined, true, undefined, this)
            ]
          }, c, true, undefined, this))
        ]
      }, undefined, true, undefined, this)
    ]
  }, undefined, true, undefined, this);
}
function useOptions(again) {
  const [list, setList] = d2(null);
  h2(() => {
    getJson("/api/options").then((o) => setList(o.settings ?? null)).catch(() => {});
  }, [again]);
  return [list, setList];
}
function Switches({ heading, keys, again }) {
  const [list, setList] = useOptions(again);
  const [error, setError] = d2("");
  const shown = (list ?? []).filter((s) => keys.includes(s.key));
  if (!shown.length)
    return null;
  const flip = async (key, on) => {
    const r = await send("/api/options", { key, on });
    const out = await r.json();
    if (!r.ok || out.error) {
      setError(out.error ?? "Couldn't save");
      return;
    }
    setError("");
    setList(out.settings);
  };
  return /* @__PURE__ */ u3("section", {
    children: [
      /* @__PURE__ */ u3("h3", {
        children: heading
      }, undefined, false, undefined, this),
      /* @__PURE__ */ u3("div", {
        class: "fields",
        children: shown.map((s) => /* @__PURE__ */ u3("div", {
          class: "field-row",
          children: [
            /* @__PURE__ */ u3("div", {
              children: [
                /* @__PURE__ */ u3("b", {
                  children: s.name
                }, undefined, false, undefined, this),
                /* @__PURE__ */ u3("span", {
                  children: s.what
                }, undefined, false, undefined, this)
              ]
            }, undefined, true, undefined, this),
            /* @__PURE__ */ u3(Toggle, {
              on: s.here === "on",
              label: s.name,
              onChange: (on) => void flip(s.key, on)
            }, undefined, false, undefined, this)
          ]
        }, s.key, true, undefined, this))
      }, undefined, false, undefined, this),
      error && /* @__PURE__ */ u3("p", {
        class: "settings-status is-error",
        children: error
      }, undefined, false, undefined, this)
    ]
  }, undefined, true, undefined, this);
}
function Agents() {
  const [list] = useOptions(null);
  const agents = list?.find((s) => s.key === "agents");
  if (!agents)
    return null;
  const has = (v, a) => [v ?? []].flat().includes(a);
  return /* @__PURE__ */ u3("section", {
    children: [
      /* @__PURE__ */ u3("h3", {
        children: "Agents"
      }, undefined, false, undefined, this),
      /* @__PURE__ */ u3("div", {
        class: "fields",
        children: agents.choices.map((c) => /* @__PURE__ */ u3("div", {
          class: "field-row",
          children: has(agents.everywhere, c.value) || has(agents.here, c.value) ? /* @__PURE__ */ u3("div", {
            children: [
              /* @__PURE__ */ u3("b", {
                children: c.label
              }, undefined, false, undefined, this),
              /* @__PURE__ */ u3("span", {
                children: has(agents.everywhere, c.value) ? "Connected in every project" : "Connected in this project"
              }, undefined, false, undefined, this)
            ]
          }, undefined, true, undefined, this) : /* @__PURE__ */ u3(S, {
            children: [
              /* @__PURE__ */ u3("div", {
                children: [
                  /* @__PURE__ */ u3("b", {
                    children: c.label
                  }, undefined, false, undefined, this),
                  /* @__PURE__ */ u3("span", {
                    children: "Not connected"
                  }, undefined, false, undefined, this),
                  /* @__PURE__ */ u3("code", {
                    children: c.set
                  }, undefined, false, undefined, this)
                ]
              }, undefined, true, undefined, this),
              /* @__PURE__ */ u3(CopyButton, {
                text: c.set ?? ""
              }, undefined, false, undefined, this)
            ]
          }, undefined, true, undefined, this)
        }, c.value, false, undefined, this))
      }, undefined, false, undefined, this)
    ]
  }, undefined, true, undefined, this);
}
function Settings() {
  const [local, setLocal] = d2(null);
  h2(() => {
    getJson("/api/local").then((d) => setLocal(Boolean(d.on)));
  }, []);
  const changeLocal = async (on) => {
    if ((await send("/api/local", { on })).ok)
      setLocal(on);
  };
  const [data, setData] = d2(null);
  const [status, setStatus] = d2("");
  const [line, setLine] = d2("");
  const install = useInstall();
  const load = () => getJson("/api/policy").then(setData);
  h2(() => {
    load();
  }, []);
  const save = async (next) => {
    if (!data)
      return;
    const body = { preset: next.preset ?? data.preset, fields: next.fields ?? data.fields, retire: next.retire ?? data.retire, tier: next.tier ?? data.tier };
    setData({ ...data, ...body, chosen: true });
    const r = await send("/api/policy", body, "PUT");
    const out = await r.json();
    if (!r.ok || out.error) {
      setStatus(out.error ?? "Couldn't save");
      load();
      return;
    }
    setData(out);
    setStatus("Saved");
    setTimeout(() => setStatus(""), 1500);
  };
  if (!data)
    return /* @__PURE__ */ u3("p", {
      class: "map-empty",
      children: "Loading settings…"
    }, undefined, false, undefined, this);
  const base = data.presets[data.preset]?.policy;
  const customised = base && Object.entries(data.fields).some(([k, v]) => base.fields[k] !== v);
  return /* @__PURE__ */ u3("div", {
    class: "settings",
    children: [
      /* @__PURE__ */ u3(AssistSettings, {}, undefined, false, undefined, this),
      /* @__PURE__ */ u3(DataSettings, {}, undefined, false, undefined, this),
      /* @__PURE__ */ u3(AbsorbSettings, {}, undefined, false, undefined, this),
      local !== null && /* @__PURE__ */ u3(LocalOnly, {
        on: local,
        onChange: (on) => void changeLocal(on)
      }, undefined, false, undefined, this),
      local !== null && /* @__PURE__ */ u3(Switches, {
        heading: "Git",
        keys: ["push", "prepush", "instructions"],
        again: local
      }, undefined, false, undefined, this),
      /* @__PURE__ */ u3(Switches, {
        heading: "Goals",
        keys: ["approvegoals"]
      }, undefined, false, undefined, this),
      /* @__PURE__ */ u3("h3", {
        children: "Presets"
      }, undefined, false, undefined, this),
      /* @__PURE__ */ u3("div", {
        class: "presets",
        children: Object.entries(data.presets).map(([key, p]) => /* @__PURE__ */ u3("button", {
          type: "button",
          class: `preset${data.preset === key ? " is-on" : ""}`,
          onClick: () => void save({ preset: key, fields: { ...p.policy.fields }, retire: p.policy.retire, tier: p.policy.tier }),
          children: [
            /* @__PURE__ */ u3("b", {
              children: [
                p.label,
                data.preset === key && customised && /* @__PURE__ */ u3("span", {
                  children: "edited"
                }, undefined, false, undefined, this)
              ]
            }, undefined, true, undefined, this),
            /* @__PURE__ */ u3("span", {
              children: p.what
            }, undefined, false, undefined, this)
          ]
        }, key, true, undefined, this))
      }, undefined, false, undefined, this),
      ["raw", "record"].map((group) => /* @__PURE__ */ u3("section", {
        children: [
          /* @__PURE__ */ u3("h3", {
            children: group === "raw" ? "Raw log" : "Records"
          }, undefined, false, undefined, this),
          /* @__PURE__ */ u3("p", {
            class: "settings-sub",
            children: group === "raw" ? "Never pushed." : local ? "Local only is on, so nothing here is pushed." : "Shared fields are pushed with your code."
          }, undefined, false, undefined, this),
          /* @__PURE__ */ u3("div", {
            class: "fields",
            children: Object.entries(data.fields_meta).filter(([, m]) => m.group === group).map(([key, m]) => /* @__PURE__ */ u3("div", {
              class: "field-row",
              children: [
                /* @__PURE__ */ u3("div", {
                  children: [
                    /* @__PURE__ */ u3("b", {
                      children: m.label
                    }, undefined, false, undefined, this),
                    /* @__PURE__ */ u3("span", {
                      children: m.what
                    }, undefined, false, undefined, this)
                  ]
                }, undefined, true, undefined, this),
                /* @__PURE__ */ u3(Segmented, {
                  label: m.label,
                  value: data.fields[key],
                  options: group === "raw" ? [["off", "Off"], ["private", "Private"]] : [["off", "Off"], ["private", "Private"], ["shared", "Shared"]],
                  onChange: (v) => void save({ fields: { ...data.fields, [key]: v } })
                }, undefined, false, undefined, this)
              ]
            }, key, true, undefined, this))
          }, undefined, false, undefined, this)
        ]
      }, group, true, undefined, this)),
      /* @__PURE__ */ u3("h3", {
        children: "New records"
      }, undefined, false, undefined, this),
      /* @__PURE__ */ u3("div", {
        class: "field-row",
        children: [
          /* @__PURE__ */ u3("div", {
            children: [
              /* @__PURE__ */ u3("b", {
                children: "Default"
              }, undefined, false, undefined, this),
              /* @__PURE__ */ u3("span", {
                children: "Used when the agent doesn't say."
              }, undefined, false, undefined, this)
            ]
          }, undefined, true, undefined, this),
          /* @__PURE__ */ u3(Segmented, {
            label: "New records",
            value: data.tier,
            options: [["private", "Private"], ["shared", "Shared"]],
            onChange: (v) => void save({ tier: v })
          }, undefined, false, undefined, this)
        ]
      }, undefined, true, undefined, this),
      /* @__PURE__ */ u3("h3", {
        children: "Retiring records"
      }, undefined, false, undefined, this),
      /* @__PURE__ */ u3("p", {
        class: "settings-sub",
        children: "Retired records stop being shown to agents. They stay in the work log and can be restored."
      }, undefined, false, undefined, this),
      /* @__PURE__ */ u3("div", {
        class: "retire",
        children: RETIRE.map(([v, label, what]) => /* @__PURE__ */ u3("button", {
          type: "button",
          class: `preset${data.retire === v ? " is-on" : ""}`,
          onClick: () => void save({ retire: v }),
          children: [
            /* @__PURE__ */ u3("b", {
              children: label
            }, undefined, false, undefined, this),
            /* @__PURE__ */ u3("span", {
              children: what
            }, undefined, false, undefined, this)
          ]
        }, v, true, undefined, this))
      }, undefined, false, undefined, this),
      /* @__PURE__ */ u3(Retirements, {}, undefined, false, undefined, this),
      /* @__PURE__ */ u3(Agents, {}, undefined, false, undefined, this),
      /* @__PURE__ */ u3("h3", {
        children: "Copy settings"
      }, undefined, false, undefined, this),
      /* @__PURE__ */ u3("p", {
        class: "settings-sub",
        children: "Use these settings in another project, or paste someone else's."
      }, undefined, false, undefined, this),
      /* @__PURE__ */ u3("div", {
        class: "policy-line",
        children: [
          /* @__PURE__ */ u3("code", {
            children: data.line
          }, undefined, false, undefined, this),
          install && /* @__PURE__ */ u3(CopyButton, {
            text: anvc(install, `policy import "${data.line}"`)
          }, undefined, false, undefined, this)
        ]
      }, undefined, true, undefined, this),
      /* @__PURE__ */ u3("form", {
        class: "policy-import",
        onSubmit: (e) => {
          e.preventDefault();
          getJson(`/api/policy/parse?line=${encodeURIComponent(line)}`).then((p) => {
            if (p.error)
              setStatus(p.error);
            else {
              save(p);
              setLine("");
            }
          });
        },
        children: [
          /* @__PURE__ */ u3("input", {
            id: "policy-line-input",
            value: line,
            placeholder: "team+steps=shared;retire=auto",
            onInput: (e) => setLine(e.currentTarget.value),
            "aria-label": "Paste a policy line"
          }, undefined, false, undefined, this),
          /* @__PURE__ */ u3("button", {
            type: "submit",
            disabled: !line.trim(),
            children: "Use"
          }, undefined, false, undefined, this)
        ]
      }, undefined, true, undefined, this),
      /* @__PURE__ */ u3(RemoveAnvc, {}, undefined, false, undefined, this),
      status && /* @__PURE__ */ u3("p", {
        class: `settings-status${status === "Saved" ? "" : " is-error"}`,
        role: "status",
        children: status
      }, undefined, false, undefined, this)
    ]
  }, undefined, true, undefined, this);
}

// server/tour.tsx
function steps(f, push) {
  const n = (x) => f ? (x ?? 0).toLocaleString() : "…";
  return [
    {
      title: "Attempts",
      body: /* @__PURE__ */ u3("p", {
        children: "ANVC keeps the attempts your agents gave up on, as well as the ones they committed."
      }, undefined, false, undefined, this),
      visual: null
    },
    {
      title: "Private and shared",
      body: /* @__PURE__ */ u3("p", {
        children: "Only shared records are pushed with your code, with paths made relative and your prompts removed. Your agent can't share a record; only you can."
      }, undefined, false, undefined, this),
      visual: /* @__PURE__ */ u3("div", {
        class: "tour-tiers",
        children: [
          /* @__PURE__ */ u3("div", {
            class: "tour-tier is-private",
            children: [
              /* @__PURE__ */ u3("header", {
                children: [
                  /* @__PURE__ */ u3(Icon, {
                    name: "hard-drive",
                    size: 20
                  }, undefined, false, undefined, this),
                  /* @__PURE__ */ u3("b", {
                    children: "Private"
                  }, undefined, false, undefined, this)
                ]
              }, undefined, true, undefined, this),
              /* @__PURE__ */ u3("ul", {
                children: [
                  /* @__PURE__ */ u3("li", {
                    children: [
                      f ? plural(f.private.captured.events, "action") : "…",
                      " in the raw log"
                    ]
                  }, undefined, true, undefined, this),
                  /* @__PURE__ */ u3("li", {
                    children: f ? plural(f.private.transcripts.files, "saved session") : "…"
                  }, undefined, false, undefined, this),
                  /* @__PURE__ */ u3("li", {
                    children: f ? plural(f.private.records, "record") : "…"
                  }, undefined, false, undefined, this)
                ]
              }, undefined, true, undefined, this)
            ]
          }, undefined, true, undefined, this),
          /* @__PURE__ */ u3("div", {
            class: "tour-arrow",
            "aria-hidden": "true",
            children: [
              /* @__PURE__ */ u3("span", {
                children: "anvc share"
              }, undefined, false, undefined, this),
              /* @__PURE__ */ u3(Icon, {
                name: "arrow-right",
                size: 20
              }, undefined, false, undefined, this)
            ]
          }, undefined, true, undefined, this),
          /* @__PURE__ */ u3("div", {
            class: "tour-tier is-shared",
            children: [
              /* @__PURE__ */ u3("header", {
                children: [
                  /* @__PURE__ */ u3(Icon, {
                    name: "git-commit-horizontal",
                    size: 20
                  }, undefined, false, undefined, this),
                  /* @__PURE__ */ u3("b", {
                    children: "Shared"
                  }, undefined, false, undefined, this)
                ]
              }, undefined, true, undefined, this),
              /* @__PURE__ */ u3("ul", {
                children: [
                  /* @__PURE__ */ u3("li", {
                    children: f ? plural(f.shared.records, "record") : "…"
                  }, undefined, false, undefined, this),
                  /* @__PURE__ */ u3("li", {
                    children: f ? `${n(f.shared.pushed)} pushed, ${n(f.shared.waiting)} waiting` : "…"
                  }, undefined, false, undefined, this),
                  /* @__PURE__ */ u3("li", {
                    children: f ? `${n(f.shared.fromTeammates)} from teammates` : "…"
                  }, undefined, false, undefined, this)
                ]
              }, undefined, true, undefined, this)
            ]
          }, undefined, true, undefined, this),
          f && !f.pushConfigured && !f.local && f.remote && /* @__PURE__ */ u3("p", {
            class: "tour-warn",
            children: [
              /* @__PURE__ */ u3(Icon, {
                name: "triangle-alert",
                size: 16
              }, undefined, false, undefined, this),
              /* @__PURE__ */ u3("span", {
                children: push.error ?? "git push doesn't carry these yet."
              }, undefined, false, undefined, this),
              !push.error && /* @__PURE__ */ u3("button", {
                type: "button",
                class: "button",
                onClick: push.turnOn,
                children: "Turn it on"
              }, undefined, false, undefined, this)
            ]
          }, undefined, true, undefined, this)
        ]
      }, undefined, true, undefined, this)
    },
    {
      title: "What an agent reads",
      body: /* @__PURE__ */ u3("p", {
        children: "An agent sees one line first, and opens more only if it needs to."
      }, undefined, false, undefined, this),
      visual: /* @__PURE__ */ u3("ol", {
        class: "tour-depth",
        children: [
          /* @__PURE__ */ u3("li", {
            children: [
              /* @__PURE__ */ u3("b", {
                children: "One line"
              }, undefined, false, undefined, this),
              /* @__PURE__ */ u3("span", {
                children: "what was abandoned, and why"
              }, undefined, false, undefined, this)
            ]
          }, undefined, true, undefined, this),
          /* @__PURE__ */ u3("li", {
            children: [
              /* @__PURE__ */ u3("b", {
                children: "Record"
              }, undefined, false, undefined, this),
              /* @__PURE__ */ u3("span", {
                children: "goal, outcome, files, recheck command"
              }, undefined, false, undefined, this)
            ]
          }, undefined, true, undefined, this),
          /* @__PURE__ */ u3("li", {
            children: [
              /* @__PURE__ */ u3("b", {
                children: "Detail"
              }, undefined, false, undefined, this),
              /* @__PURE__ */ u3("span", {
                children: "full output, what was ruled out, what wasn't checked"
              }, undefined, false, undefined, this)
            ]
          }, undefined, true, undefined, this),
          /* @__PURE__ */ u3("li", {
            children: [
              /* @__PURE__ */ u3("b", {
                children: "Raw log"
              }, undefined, false, undefined, this),
              /* @__PURE__ */ u3("span", {
                children: "everything, only on this computer"
              }, undefined, false, undefined, this)
            ]
          }, undefined, true, undefined, this)
        ]
      }, undefined, true, undefined, this)
    }
  ];
}
function Tour({ open, onClose, onChoose }) {
  const [facts, setFacts] = d2(null);
  const [at, setAt] = d2(0);
  const [pushError, setPushError] = d2(null);
  const load = () => void getJson("/api/tiers", { signal: AbortSignal.timeout(1e4) }).then((body) => {
    if (!("error" in body))
      setFacts(body);
  }).catch(() => {});
  const turnOn = () => void send("/api/options", { key: "push", on: true }).then((r) => r.json()).then((body) => {
    if (body.error)
      setPushError(body.error);
    else
      load();
  }).catch(() => setPushError("Couldn't reach ANVC to turn it on."));
  const list = steps(facts, { turnOn, error: pushError });
  const last = at === list.length - 1;
  h2(() => {
    if (!open)
      return;
    setAt(0);
    load();
  }, [open]);
  const close = () => {
    send("/api/seen", { key: "tour" });
    onClose();
  };
  h2(() => {
    if (!open)
      return;
    const onKey = (event) => {
      if (event.key === "ArrowRight")
        setAt((i) => Math.min(list.length - 1, i + 1));
      if (event.key === "ArrowLeft")
        setAt((i) => Math.max(0, i - 1));
    };
    addEventListener("keydown", onKey);
    return () => removeEventListener("keydown", onKey);
  }, [open, list.length]);
  const step = list[at];
  return /* @__PURE__ */ u3(Modal, {
    open,
    onClose: close,
    class: "tour",
    "aria-labelledby": "tour-title",
    children: open && /* @__PURE__ */ u3(S, {
      children: [
        /* @__PURE__ */ u3("button", {
          type: "button",
          class: "icon-button",
          onClick: close,
          "aria-label": "Close the tour",
          children: /* @__PURE__ */ u3(Icon, {
            name: "close",
            size: 18
          }, undefined, false, undefined, this)
        }, undefined, false, undefined, this),
        /* @__PURE__ */ u3("p", {
          class: "tour-count",
          children: [
            at + 1,
            " of ",
            list.length
          ]
        }, undefined, true, undefined, this),
        /* @__PURE__ */ u3("div", {
          class: "tour-step",
          children: [
            /* @__PURE__ */ u3("h2", {
              id: "tour-title",
              children: step.title
            }, undefined, false, undefined, this),
            /* @__PURE__ */ u3("div", {
              class: "tour-body",
              children: step.body
            }, undefined, false, undefined, this),
            step.visual && /* @__PURE__ */ u3("div", {
              class: "tour-visual",
              children: step.visual
            }, undefined, false, undefined, this)
          ]
        }, at, true, undefined, this),
        /* @__PURE__ */ u3("footer", {
          class: "tour-nav",
          children: [
            /* @__PURE__ */ u3("div", {
              class: "tour-dots",
              role: "tablist",
              "aria-label": "Tour steps",
              children: list.map((s, i) => /* @__PURE__ */ u3("button", {
                type: "button",
                role: "tab",
                "aria-selected": i === at,
                "aria-label": `Step ${i + 1}: ${s.title}`,
                class: i === at ? "is-on" : "",
                onClick: () => setAt(i)
              }, s.title, false, undefined, this))
            }, undefined, false, undefined, this),
            /* @__PURE__ */ u3("div", {
              class: "tour-buttons",
              children: [
                at > 0 && /* @__PURE__ */ u3("button", {
                  type: "button",
                  class: "button",
                  onClick: () => setAt(at - 1),
                  children: "Back"
                }, undefined, false, undefined, this),
                last && /* @__PURE__ */ u3("button", {
                  type: "button",
                  class: "button",
                  onClick: close,
                  children: "Done"
                }, undefined, false, undefined, this),
                /* @__PURE__ */ u3("button", {
                  type: "button",
                  class: "button primary",
                  onClick: () => {
                    if (!last) {
                      setAt(at + 1);
                      return;
                    }
                    send("/api/seen", { key: "tour" });
                    onChoose();
                  },
                  children: [
                    last ? "Choose what to save" : "Next",
                    /* @__PURE__ */ u3(Icon, {
                      name: "arrow-right",
                      size: 16
                    }, undefined, false, undefined, this)
                  ]
                }, undefined, true, undefined, this)
              ]
            }, undefined, true, undefined, this)
          ]
        }, undefined, true, undefined, this)
      ]
    }, undefined, true, undefined, this)
  }, undefined, false, undefined, this);
}

// server/choose.tsx
var OFFERED = [
  ["private-repo", "Private", "Only you read it"],
  ["team", "Team", "Others read it"],
  ["minimal", "Minimal", "Keep the least"]
];
var ROWS = [
  ["Prompts", ["prompts"]],
  ["Commands", ["commands", "output", "delegations"]],
  ["Files read and edited", ["paths"]],
  ["Sessions", ["transcripts"]],
  ["Goals and reasons", ["why", "files", "recheck"]],
  ["Errors and notes", ["errors", "evidence", "narrative", "ruled_out", "not_investigated", "maps"]],
  ["Full output", ["detail_output", "steps"]]
];
var RANK = { off: 0, private: 1, shared: 2 };
function effective(p, field) {
  const c = p.policy.fields[field] ?? "off";
  return c === "shared" && p.policy.tier === "private" ? "private" : c;
}
var rowChoice = (p, fields) => fields.map((f) => effective(p, f)).reduce((a, b) => RANK[b] > RANK[a] ? b : a, "off");
var PLACES = [
  ["shared", "git-commit-horizontal", "Pushed"],
  ["private", "hard-drive", "This computer"],
  ["off", "minus", "Not saved"]
];
function Choose({ open, onClose, onCustomise }) {
  const [presets, setPresets] = d2(null);
  const [current, setCurrent] = d2("team");
  const [error, setError] = d2("");
  const [assist, setAssist] = d2(null);
  const [step, setStep] = d2("share");
  const [chosen, setChosen] = d2(false);
  h2(() => {
    if (!open)
      return;
    loadAssist().then((v) => {
      setAssist(v);
      if (v.everywhere.from === "default")
        setStep("assist");
    }).catch(() => {});
    getJson("/api/policy").then((d) => {
      setPresets(d.presets);
      setCurrent(d.preset);
      setChosen(Boolean(d.chosen));
    }).catch(() => setError("Couldn't read the settings"));
  }, [open]);
  const use = async (key) => {
    const p = presets[key];
    const r = await send("/api/policy", { preset: key, ...p.policy }, "PUT");
    if (!r.ok) {
      setError((await r.json()).error ?? "Couldn't save");
      return;
    }
    onClose();
  };
  return /* @__PURE__ */ u3(Modal, {
    open,
    onClose,
    class: "tour setup",
    "aria-labelledby": "choose-title",
    children: open && /* @__PURE__ */ u3(S, {
      children: [
        /* @__PURE__ */ u3("button", {
          type: "button",
          class: "icon-button",
          onClick: onClose,
          "aria-label": "Close",
          children: /* @__PURE__ */ u3(Icon, {
            name: "close",
            size: 18
          }, undefined, false, undefined, this)
        }, undefined, false, undefined, this),
        step === "assist" && assist ? /* @__PURE__ */ u3(S, {
          children: [
            /* @__PURE__ */ u3("h2", {
              id: "choose-title",
              children: "How much should ANVC tell your agent?"
            }, undefined, false, undefined, this),
            /* @__PURE__ */ u3("p", {
              class: "settings-sub",
              children: "For every project. Whatever you pick, you can ask your agent to check ANVC yourself."
            }, undefined, false, undefined, this),
            /* @__PURE__ */ u3(AssistLevels, {
              view: assist,
              current: assist.everywhere.level,
              onPick: (level) => void saveAssist({ scope: "everywhere", level }).then((v) => {
                if (!v) {
                  setError("Couldn't save");
                  return;
                }
                setAssist(v);
                if (chosen)
                  onClose();
                else
                  setStep("share");
              })
            }, undefined, false, undefined, this)
          ]
        }, undefined, true, undefined, this) : /* @__PURE__ */ u3(S, {
          children: [
            /* @__PURE__ */ u3("h2", {
              id: "choose-title",
              children: "Who can read what the agent saves?"
            }, undefined, false, undefined, this),
            !presets ? /* @__PURE__ */ u3("p", {
              class: "settings-sub",
              children: error || "Reading…"
            }, undefined, false, undefined, this) : /* @__PURE__ */ u3("div", {
              class: "setup-cols",
              children: OFFERED.map(([key, name, who]) => {
                const p = presets[key];
                const all = Object.keys(p.policy.fields);
                const kept = all.filter((f) => effective(p, f) !== "off").length;
                const shared = all.filter((f) => effective(p, f) === "shared").length;
                const pct = (n) => Math.round(100 * n / all.length);
                return /* @__PURE__ */ u3("section", {
                  class: `setup-col${current === key ? " is-on" : ""}`,
                  children: [
                    /* @__PURE__ */ u3("header", {
                      children: [
                        /* @__PURE__ */ u3("b", {
                          children: [
                            name,
                            key === "team" && /* @__PURE__ */ u3("span", {
                              class: "setup-tag",
                              children: "Recommended"
                            }, undefined, false, undefined, this),
                            current === key && /* @__PURE__ */ u3("span", {
                              class: "setup-tag is-current",
                              children: "Current"
                            }, undefined, false, undefined, this)
                          ]
                        }, undefined, true, undefined, this),
                        /* @__PURE__ */ u3("span", {
                          children: who
                        }, undefined, false, undefined, this)
                      ]
                    }, undefined, true, undefined, this),
                    /* @__PURE__ */ u3("div", {
                      class: "setup-bars",
                      children: [
                        /* @__PURE__ */ u3("div", {
                          children: [
                            /* @__PURE__ */ u3("span", {
                              children: "Saved"
                            }, undefined, false, undefined, this),
                            /* @__PURE__ */ u3("i", {
                              style: { "--w": `${pct(kept)}%` }
                            }, undefined, false, undefined, this),
                            /* @__PURE__ */ u3("b", {
                              children: [
                                pct(kept),
                                "%"
                              ]
                            }, undefined, true, undefined, this)
                          ]
                        }, undefined, true, undefined, this),
                        /* @__PURE__ */ u3("div", {
                          class: "is-shared",
                          children: [
                            /* @__PURE__ */ u3("span", {
                              children: "Pushed"
                            }, undefined, false, undefined, this),
                            /* @__PURE__ */ u3("i", {
                              style: { "--w": `${pct(shared)}%` }
                            }, undefined, false, undefined, this),
                            /* @__PURE__ */ u3("b", {
                              children: [
                                pct(shared),
                                "%"
                              ]
                            }, undefined, true, undefined, this)
                          ]
                        }, undefined, true, undefined, this)
                      ]
                    }, undefined, true, undefined, this),
                    /* @__PURE__ */ u3("div", {
                      class: "setup-places",
                      children: PLACES.map(([place, icon, heading]) => {
                        const rows = ROWS.filter(([, fields]) => rowChoice(p, fields) === place);
                        if (!rows.length)
                          return null;
                        return /* @__PURE__ */ u3("div", {
                          class: `setup-place is-${place}`,
                          children: [
                            /* @__PURE__ */ u3("h3", {
                              children: [
                                /* @__PURE__ */ u3(Icon, {
                                  name: icon,
                                  size: 16
                                }, undefined, false, undefined, this),
                                heading
                              ]
                            }, undefined, true, undefined, this),
                            /* @__PURE__ */ u3("ul", {
                              children: rows.map(([label]) => /* @__PURE__ */ u3("li", {
                                children: label
                              }, label, false, undefined, this))
                            }, undefined, false, undefined, this)
                          ]
                        }, place, true, undefined, this);
                      })
                    }, undefined, false, undefined, this),
                    /* @__PURE__ */ u3("button", {
                      type: "button",
                      class: key === "team" ? "button primary" : "button",
                      onClick: () => void use(key),
                      children: "Use"
                    }, undefined, false, undefined, this)
                  ]
                }, key, true, undefined, this);
              })
            }, undefined, false, undefined, this)
          ]
        }, undefined, true, undefined, this),
        /* @__PURE__ */ u3("footer", {
          class: "setup-foot",
          children: [
            /* @__PURE__ */ u3("button", {
              type: "button",
              class: "setup-custom",
              onClick: onCustomise,
              children: [
                /* @__PURE__ */ u3(Icon, {
                  name: "sliders",
                  size: 18
                }, undefined, false, undefined, this),
                /* @__PURE__ */ u3("span", {
                  children: [
                    "You can change this in ",
                    /* @__PURE__ */ u3("b", {
                      children: "Settings"
                    }, undefined, false, undefined, this),
                    "."
                  ]
                }, undefined, true, undefined, this),
                /* @__PURE__ */ u3(Icon, {
                  name: "arrow-right",
                  size: 16
                }, undefined, false, undefined, this)
              ]
            }, undefined, true, undefined, this),
            error && presets && /* @__PURE__ */ u3("p", {
              class: "settings-status is-error",
              children: error
            }, undefined, false, undefined, this)
          ]
        }, undefined, true, undefined, this)
      ]
    }, undefined, true, undefined, this)
  }, undefined, false, undefined, this);
}

// server/goals.tsx
var LABEL2 = { todo: "To do", doing: "In progress", done: "Done", dropped: "Dropped" };
var STATUSES = Object.entries(LABEL2);
var MARKED = { todo: "Marked to do", doing: "Marked in progress", done: "Marked done", dropped: "Dropped" };
var same = (a, b) => a.title === b.title && a.status === b.status;
function what(v, before) {
  if (!before)
    return "Added";
  const parts = [
    ...v.title !== before.title ? [`Renamed from “${before.title}”`] : [],
    ...v.status !== before.status ? [MARKED[v.status]] : []
  ];
  return parts.join(", ") || "No change";
}
var who = (v) => v.from ? `${v.agent} on ${v.from}` : v.by === "person" ? "You" : `${v.agent}, session ${v.session.slice(0, 8)}`;
function History({ goal, save }) {
  let last, waiting;
  const rows = goal.versions.map((v) => {
    const row = { v, what: what(v, last), before: last };
    if (!v.counts)
      return row;
    if (v.proposed) {
      row.what = last ? `Proposed: ${row.what}` : "Proposed";
      waiting = v;
      last ??= v;
      return row;
    }
    if (waiting) {
      if (same(v, waiting))
        row.what = "Accepted";
      else if (same(v, last) || waiting.id === goal.id && v.status === "dropped" && v.title === waiting.title)
        row.what = "Declined";
    }
    last = v;
    waiting = undefined;
    return row;
  });
  const latest = rows.findLast((r) => r.v.counts && !r.v.proposed);
  return /* @__PURE__ */ u3("section", {
    class: "goal-section",
    children: [
      /* @__PURE__ */ u3("h4", {
        children: "History"
      }, undefined, false, undefined, this),
      /* @__PURE__ */ u3("ol", {
        class: "goal-history",
        children: rows.map((r) => /* @__PURE__ */ u3("li", {
          class: r.v.counts ? "" : "is-ignored",
          children: [
            /* @__PURE__ */ u3("time", {
              children: when(r.v.ts)
            }, undefined, false, undefined, this),
            /* @__PURE__ */ u3("div", {
              children: [
                /* @__PURE__ */ u3("p", {
                  children: [
                    /* @__PURE__ */ u3("span", {
                      children: r.what
                    }, undefined, false, undefined, this),
                    /* @__PURE__ */ u3("span", {
                      class: "goal-who",
                      children: who(r.v)
                    }, undefined, false, undefined, this),
                    !r.v.counts && /* @__PURE__ */ u3("span", {
                      class: "goal-who",
                      children: "not applied"
                    }, undefined, false, undefined, this),
                    r === latest && r.before && !same(r.v, r.before) && /* @__PURE__ */ u3("button", {
                      type: "button",
                      class: "link-button",
                      onClick: () => void save({
                        id: goal.id,
                        title: r.before.title,
                        status: r.before.status,
                        why: `Undid: ${r.what}`
                      }),
                      children: "Undo"
                    }, undefined, false, undefined, this)
                  ]
                }, undefined, true, undefined, this),
                r.v.why && r.v.id !== goal.id && /* @__PURE__ */ u3("small", {
                  children: r.v.why
                }, undefined, false, undefined, this)
              ]
            }, undefined, true, undefined, this)
          ]
        }, r.v.id, true, undefined, this))
      }, undefined, false, undefined, this)
    ]
  }, undefined, true, undefined, this);
}
function Proposed({ goal, save }) {
  const p = goal.proposal;
  return /* @__PURE__ */ u3("div", {
    class: "goal-proposal",
    children: [
      /* @__PURE__ */ u3("p", {
        children: [
          /* @__PURE__ */ u3("b", {
            children: p.added ? "Proposed" : `Proposed: ${what(p, goal)}`
          }, undefined, false, undefined, this),
          /* @__PURE__ */ u3("span", {
            class: "goal-who",
            children: who(p)
          }, undefined, false, undefined, this)
        ]
      }, undefined, true, undefined, this),
      p.why && !(p.added && p.id === goal.id) && /* @__PURE__ */ u3("small", {
        children: p.why
      }, undefined, false, undefined, this),
      /* @__PURE__ */ u3("div", {
        class: "goal-actions",
        children: [
          /* @__PURE__ */ u3("button", {
            type: "button",
            class: "button primary",
            onClick: () => void save({ id: goal.id, answer: "accept" }),
            children: "Accept"
          }, undefined, false, undefined, this),
          /* @__PURE__ */ u3("button", {
            type: "button",
            class: "button",
            onClick: () => void save({ id: goal.id, answer: "decline" }),
            children: "Decline"
          }, undefined, false, undefined, this)
        ]
      }, undefined, true, undefined, this)
    ]
  }, undefined, true, undefined, this);
}
function GoalItem({ goal, save }) {
  const [open, setOpen] = d2(false);
  const [form, setForm] = d2(null);
  const done = (ok) => {
    if (ok)
      setForm(null);
  };
  return /* @__PURE__ */ u3("li", {
    class: `goal is-${goal.status}`,
    children: [
      /* @__PURE__ */ u3("button", {
        type: "button",
        class: "goal-row",
        "aria-expanded": open,
        onClick: () => setOpen(!open),
        children: [
          /* @__PURE__ */ u3("span", {
            class: `goal-status is-${goal.status}`,
            children: LABEL2[goal.status]
          }, undefined, false, undefined, this),
          /* @__PURE__ */ u3("span", {
            class: "goal-title",
            children: goal.title
          }, undefined, false, undefined, this),
          goal.from && /* @__PURE__ */ u3("span", {
            class: "goal-from",
            children: [
              "from ",
              goal.from
            ]
          }, undefined, true, undefined, this),
          goal.proposal && /* @__PURE__ */ u3("span", {
            class: "goal-proposed",
            children: goal.proposal.added ? "Proposed" : "Change proposed"
          }, undefined, false, undefined, this),
          goal.total > 0 && /* @__PURE__ */ u3("span", {
            class: "goal-progress",
            children: [
              goal.done,
              " of ",
              goal.total,
              " done"
            ]
          }, undefined, true, undefined, this)
        ]
      }, undefined, true, undefined, this),
      open && /* @__PURE__ */ u3("div", {
        class: "goal-detail",
        children: [
          goal.why && /* @__PURE__ */ u3("p", {
            class: "goal-why",
            children: goal.why
          }, undefined, false, undefined, this),
          goal.proposal && /* @__PURE__ */ u3(Proposed, {
            goal,
            save
          }, undefined, false, undefined, this),
          /* @__PURE__ */ u3("div", {
            class: "goal-actions",
            children: [
              /* @__PURE__ */ u3(Segmented, {
                label: "Status",
                value: goal.status,
                options: STATUSES,
                onChange: (status) => void save({ id: goal.id, status })
              }, undefined, false, undefined, this),
              /* @__PURE__ */ u3("button", {
                type: "button",
                class: "button",
                onClick: () => setForm("rename"),
                children: [
                  /* @__PURE__ */ u3(Icon, {
                    name: "pencil",
                    size: 14
                  }, undefined, false, undefined, this),
                  "Rename"
                ]
              }, undefined, true, undefined, this),
              /* @__PURE__ */ u3("button", {
                type: "button",
                class: "button",
                onClick: () => setForm("sub"),
                children: [
                  /* @__PURE__ */ u3(Icon, {
                    name: "plus",
                    size: 14
                  }, undefined, false, undefined, this),
                  "Add sub-goal"
                ]
              }, undefined, true, undefined, this)
            ]
          }, undefined, true, undefined, this),
          form === "rename" && /* @__PURE__ */ u3(TitleForm, {
            label: "Title",
            submit: "Save",
            initial: goal.title,
            onSave: (title) => void save({ id: goal.id, title }).then(done),
            onCancel: () => setForm(null)
          }, undefined, false, undefined, this),
          form === "sub" && /* @__PURE__ */ u3(TitleForm, {
            label: "Sub-goal",
            submit: "Add",
            onSave: (title) => void save({ parent: goal.id, title }).then(done),
            onCancel: () => setForm(null)
          }, undefined, false, undefined, this),
          /* @__PURE__ */ u3(History, {
            goal,
            save
          }, undefined, false, undefined, this),
          goal.attempts.length > 0 && /* @__PURE__ */ u3("section", {
            class: "goal-section",
            children: [
              /* @__PURE__ */ u3("h4", {
                children: "Attempts"
              }, undefined, false, undefined, this),
              /* @__PURE__ */ u3("ul", {
                class: "goal-attempts",
                children: goal.attempts.map((a) => /* @__PURE__ */ u3("li", {
                  children: [
                    /* @__PURE__ */ u3(OutcomeBadge, {
                      status: a.status
                    }, undefined, false, undefined, this),
                    /* @__PURE__ */ u3("span", {
                      children: a.intent || "No goal recorded"
                    }, undefined, false, undefined, this),
                    /* @__PURE__ */ u3("time", {
                      children: when(a.ts)
                    }, undefined, false, undefined, this)
                  ]
                }, a.id, true, undefined, this))
              }, undefined, false, undefined, this)
            ]
          }, undefined, true, undefined, this),
          /* @__PURE__ */ u3("span", {
            class: "goal-id",
            children: [
              "id ",
              goal.id
            ]
          }, undefined, true, undefined, this)
        ]
      }, undefined, true, undefined, this),
      goal.subgoals.length > 0 && /* @__PURE__ */ u3("ul", {
        class: "goal-list",
        children: goal.subgoals.map((s) => /* @__PURE__ */ u3(GoalItem, {
          goal: s,
          save
        }, s.id, false, undefined, this))
      }, undefined, false, undefined, this)
    ]
  }, undefined, true, undefined, this);
}
function Goals() {
  const { data, error, save } = useLive("/api/goals");
  const [adding, setAdding] = d2(false);
  if (!data)
    return null;
  const { goals } = data;
  const live = goals.filter((g) => g.status !== "dropped");
  return /* @__PURE__ */ u3("section", {
    class: "goals",
    children: [
      /* @__PURE__ */ u3("header", {
        class: "goals-head",
        children: [
          /* @__PURE__ */ u3("h2", {
            children: "Goals"
          }, undefined, false, undefined, this),
          live.length > 0 && /* @__PURE__ */ u3("span", {
            class: "goal-progress",
            children: [
              live.filter((g) => g.status === "done").length,
              " of ",
              live.length,
              " done"
            ]
          }, undefined, true, undefined, this),
          !adding && /* @__PURE__ */ u3("button", {
            type: "button",
            class: "button",
            onClick: () => setAdding(true),
            children: [
              /* @__PURE__ */ u3(Icon, {
                name: "plus",
                size: 14
              }, undefined, false, undefined, this),
              "Add goal"
            ]
          }, undefined, true, undefined, this)
        ]
      }, undefined, true, undefined, this),
      /* @__PURE__ */ u3(AbsorbNote, {
        what: "goals"
      }, undefined, false, undefined, this),
      error && /* @__PURE__ */ u3("p", {
        class: "settings-status is-error",
        children: error
      }, undefined, false, undefined, this),
      adding && /* @__PURE__ */ u3(TitleForm, {
        label: "Goal",
        submit: "Add",
        onSave: (title) => void save({ title }).then((ok) => ok && setAdding(false)),
        onCancel: () => setAdding(false)
      }, undefined, false, undefined, this),
      !goals.length && !adding && /* @__PURE__ */ u3("p", {
        class: "goals-empty",
        children: "No goals yet."
      }, undefined, false, undefined, this),
      goals.length > 0 && /* @__PURE__ */ u3("ul", {
        class: "goal-list",
        children: goals.map((g) => /* @__PURE__ */ u3(GoalItem, {
          goal: g,
          save
        }, g.id, false, undefined, this))
      }, undefined, false, undefined, this)
    ]
  }, undefined, true, undefined, this);
}

// server/map.tsx
var LAYER = {
  edge: {
    name: "Entry points",
    icon: "plug",
    what: "Where work comes in: agent sessions and editor hooks."
  },
  tool: {
    name: "Tools",
    icon: "wrench",
    what: "Run by an agent or a person when needed."
  },
  core: {
    name: "Core logic",
    icon: "cpu",
    what: "The rules for records and queries."
  },
  store: {
    name: "Storage",
    icon: "database",
    what: "Where records are kept."
  },
  surface: {
    name: "Screens",
    icon: "monitor",
    what: "What people look at."
  }
};
var iconOf = (layer) => LAYER[layer]?.icon ?? LAYER.core.icon;
var hueOf = (layer) => ({ "--hue": `var(--layer-${LAYER[layer] ? layer : "core"})` });
function wire(points, radius = 10) {
  if (points.length < 2)
    return "";
  if (points.length === 2)
    return `M${points[0].x} ${points[0].y}L${points[1].x} ${points[1].y}`;
  let d = `M${points[0].x} ${points[0].y}`;
  for (let i = 1;i < points.length - 1; i++) {
    const prev = points[i - 1], at = points[i], next = points[i + 1];
    const inLen = Math.hypot(at.x - prev.x, at.y - prev.y) || 1;
    const outLen = Math.hypot(next.x - at.x, next.y - at.y) || 1;
    const r = Math.min(radius, inLen / 2, outLen / 2);
    const from = { x: at.x - (at.x - prev.x) / inLen * r, y: at.y - (at.y - prev.y) / inLen * r };
    const to = { x: at.x + (next.x - at.x) / outLen * r, y: at.y + (next.y - at.y) / outLen * r };
    d += `L${from.x} ${from.y}Q${at.x} ${at.y} ${to.x} ${to.y}`;
  }
  const last = points.at(-1);
  return `${d}L${last.x} ${last.y}`;
}
function useCanvas(width, height) {
  const box = A2(null);
  const [view, setView] = d2({ x: 0, y: 0, k: 1 });
  const drag = A2(null);
  const [dragging, setDragging] = d2(false);
  const fit = q2(() => {
    const el = box.current;
    if (!el || !width || !height)
      return;
    const pad = 56;
    const k = Math.min((el.clientWidth - pad) / width, (el.clientHeight - pad) / height, 1.2);
    setView({ k, x: (el.clientWidth - width * k) / 2, y: (el.clientHeight - height * k) / 2 });
  }, [width, height]);
  h2(() => {
    const id = requestAnimationFrame(fit);
    const onResize = () => fit();
    addEventListener("resize", onResize);
    return () => {
      cancelAnimationFrame(id);
      removeEventListener("resize", onResize);
    };
  }, [fit]);
  const zoomAt = (px, py, factor) => setView((v) => {
    const k = Math.min(2.4, Math.max(0.25, v.k * factor));
    return { k, x: px - (px - v.x) / v.k * k, y: py - (py - v.y) / v.k * k };
  });
  const zoomAtPointer = (event, factor) => {
    event.preventDefault();
    const rect = box.current?.getBoundingClientRect();
    if (rect)
      zoomAt(event.clientX - rect.left, event.clientY - rect.top, factor);
  };
  const onWheel = (event) => zoomAtPointer(event, event.deltaY < 0 ? 1.12 : 1 / 1.12);
  const onDown = (event) => {
    if (event.button !== 0)
      return;
    event.preventDefault();
    drag.current = { x: event.clientX, y: event.clientY, vx: view.x, vy: view.y };
    setDragging(true);
  };
  const onMove = (event) => {
    const d = drag.current;
    if (!d)
      return;
    setView((v) => ({ ...v, x: d.vx + (event.clientX - d.x), y: d.vy + (event.clientY - d.y) }));
  };
  const stop = () => {
    drag.current = null;
    setDragging(false);
  };
  const onDouble = (event) => zoomAtPointer(event, 1.6);
  const zoom = (factor) => zoomAt((box.current?.clientWidth ?? 0) / 2, (box.current?.clientHeight ?? 0) / 2, factor);
  return { box, view, fit, zoom, onWheel, onDown, onMove, onDouble, stop, dragging };
}
function FlowNode({ node, focus, dim, onPick }) {
  return /* @__PURE__ */ u3("g", {
    class: `fnode${dim ? " is-dim" : ""}${focus ? " is-focus" : ""}`,
    transform: `translate(${node.x} ${node.y})`,
    onClick: (e) => {
      e.stopPropagation();
      onPick(node.id);
    },
    role: "button",
    tabIndex: 0,
    onKeyDown: (e) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        onPick(node.id);
      }
    },
    "aria-label": `${node.label}. ${node.does}`,
    style: hueOf(node.layer),
    children: [
      /* @__PURE__ */ u3("rect", {
        class: "fnode-lift",
        x: "1",
        y: "5",
        width: node.w,
        height: node.h,
        rx: "13"
      }, undefined, false, undefined, this),
      /* @__PURE__ */ u3("rect", {
        class: "fnode-body",
        width: node.w,
        height: node.h,
        rx: "13"
      }, undefined, false, undefined, this),
      /* @__PURE__ */ u3("g", {
        class: "fnode-icon",
        transform: "translate(19 18)",
        children: /* @__PURE__ */ u3(Icon, {
          name: iconOf(node.layer),
          size: 17
        }, undefined, false, undefined, this)
      }, undefined, false, undefined, this),
      /* @__PURE__ */ u3("text", {
        class: "fnode-title",
        x: "44",
        y: "31",
        children: node.title
      }, undefined, false, undefined, this),
      node.stale && /* @__PURE__ */ u3("g", {
        class: "fnode-stale",
        transform: `translate(${node.w - 34} 18)`,
        children: [
          /* @__PURE__ */ u3("title", {
            children: "Description is older than the code"
          }, undefined, false, undefined, this),
          /* @__PURE__ */ u3(Icon, {
            name: "triangle-alert",
            size: 16
          }, undefined, false, undefined, this)
        ]
      }, undefined, true, undefined, this),
      node.text.map((line, i) => /* @__PURE__ */ u3("text", {
        class: "fnode-does",
        x: "19",
        y: 54 + i * 20,
        children: line
      }, i, false, undefined, this)),
      /* @__PURE__ */ u3("text", {
        class: "fnode-badge",
        x: "19",
        y: node.h - 15,
        children: node.badge.map((part, i) => /* @__PURE__ */ u3("tspan", {
          class: part.lost ? "is-lost" : undefined,
          children: i > 0 ? `  ·  ${part.text}` : part.text
        }, part.text, false, undefined, this))
      }, undefined, false, undefined, this)
    ]
  }, undefined, true, undefined, this);
}
function Flow({ data, picked, onPick }) {
  const canvas = useCanvas(data.width, data.height);
  const [hover, setHover] = d2(null);
  const focus = hover ?? picked;
  const near = T2(() => {
    if (!focus)
      return null;
    const set = new Set([focus]);
    for (const e of data.edges) {
      if (e.from === focus)
        set.add(e.to);
      if (e.to === focus)
        set.add(e.from);
    }
    return set;
  }, [focus, data.edges]);
  const { view } = canvas;
  const showLabels = view.k > 0.7;
  return /* @__PURE__ */ u3("div", {
    class: "canvas-wrap",
    children: [
      /* @__PURE__ */ u3("div", {
        class: `canvas${canvas.dragging ? " is-dragging" : ""}`,
        ref: canvas.box,
        onWheel: canvas.onWheel,
        onMouseDown: canvas.onDown,
        onDblClick: canvas.onDouble,
        onMouseMove: canvas.onMove,
        onMouseUp: canvas.stop,
        onMouseLeave: canvas.stop,
        onClick: () => onPick(""),
        children: /* @__PURE__ */ u3("svg", {
          width: "100%",
          height: "100%",
          role: "img",
          "aria-label": "System parts and their dependencies",
          children: /* @__PURE__ */ u3("g", {
            transform: `translate(${view.x} ${view.y}) scale(${view.k})`,
            children: [
              /* @__PURE__ */ u3("defs", {
                children: [
                  /* @__PURE__ */ u3("marker", {
                    id: "arrow",
                    viewBox: "0 0 10 10",
                    refX: "9",
                    refY: "5",
                    markerWidth: "7",
                    markerHeight: "7",
                    orient: "auto-start-reverse",
                    children: /* @__PURE__ */ u3("path", {
                      d: "M0 0L10 5L0 10z",
                      fill: "var(--line-strong)"
                    }, undefined, false, undefined, this)
                  }, undefined, false, undefined, this),
                  /* @__PURE__ */ u3("marker", {
                    id: "arrow-on",
                    viewBox: "0 0 10 10",
                    refX: "9",
                    refY: "5",
                    markerWidth: "7.5",
                    markerHeight: "7.5",
                    orient: "auto-start-reverse",
                    children: /* @__PURE__ */ u3("path", {
                      d: "M0 0L10 5L0 10z",
                      fill: "var(--accent)"
                    }, undefined, false, undefined, this)
                  }, undefined, false, undefined, this)
                ]
              }, undefined, true, undefined, this),
              data.edges.map((e) => {
                const on = Boolean(near && near.has(e.from) && near.has(e.to));
                const off = Boolean(near && !on);
                const text = e.short ?? "";
                return /* @__PURE__ */ u3("g", {
                  class: `fedge${off ? " is-dim" : ""}${on ? " is-on" : ""}${e.weight === 0 ? " is-unbacked" : ""}`,
                  children: [
                    /* @__PURE__ */ u3("path", {
                      d: wire(e.points),
                      fill: "none",
                      "stroke-width": e.weight > 0 ? Math.min(3.4, 1.4 + e.weight * 0.35) : 1.4,
                      "marker-end": on ? "url(#arrow-on)" : "url(#arrow)",
                      children: /* @__PURE__ */ u3("title", {
                        children: e.weight > 0 ? `${plural(e.weight, "file")} in ${e.from} import from ${e.to}` : `${e.from} depends on ${e.to}, described but with no import behind it`
                      }, undefined, false, undefined, this)
                    }, undefined, false, undefined, this),
                    showLabels && text && e.label && /* @__PURE__ */ u3(S, {
                      children: [
                        /* @__PURE__ */ u3("text", {
                          class: "fedge-plate",
                          x: e.label.x,
                          y: e.label.y - 11,
                          "text-anchor": "middle",
                          children: text
                        }, undefined, false, undefined, this),
                        /* @__PURE__ */ u3("text", {
                          class: "fedge-label",
                          x: e.label.x,
                          y: e.label.y - 11,
                          "text-anchor": "middle",
                          children: text
                        }, undefined, false, undefined, this)
                      ]
                    }, undefined, true, undefined, this)
                  ]
                }, e.id, true, undefined, this);
              }),
              data.nodes.map((n) => /* @__PURE__ */ u3("g", {
                onMouseEnter: () => setHover(n.id),
                onMouseLeave: () => setHover(null),
                children: /* @__PURE__ */ u3(FlowNode, {
                  node: n,
                  focus: focus === n.id,
                  dim: Boolean(near && !near.has(n.id)),
                  onPick
                }, undefined, false, undefined, this)
              }, n.id, false, undefined, this))
            ]
          }, undefined, true, undefined, this)
        }, undefined, false, undefined, this)
      }, undefined, false, undefined, this),
      /* @__PURE__ */ u3("div", {
        class: "canvas-controls",
        children: [
          /* @__PURE__ */ u3("button", {
            type: "button",
            onClick: () => canvas.zoom(1.25),
            "aria-label": "Zoom in",
            children: /* @__PURE__ */ u3(Icon, {
              name: "plus",
              size: 17
            }, undefined, false, undefined, this)
          }, undefined, false, undefined, this),
          /* @__PURE__ */ u3("button", {
            type: "button",
            onClick: () => canvas.zoom(1 / 1.25),
            "aria-label": "Zoom out",
            children: /* @__PURE__ */ u3(Icon, {
              name: "minus",
              size: 17
            }, undefined, false, undefined, this)
          }, undefined, false, undefined, this),
          /* @__PURE__ */ u3("button", {
            type: "button",
            class: "is-wide",
            onClick: canvas.fit,
            children: "Fit"
          }, undefined, false, undefined, this)
        ]
      }, undefined, true, undefined, this),
      /* @__PURE__ */ u3(Legend, {}, undefined, false, undefined, this)
    ]
  }, undefined, true, undefined, this);
}
function Legend() {
  return /* @__PURE__ */ u3("details", {
    class: "legend",
    children: [
      /* @__PURE__ */ u3("summary", {
        class: "legend-toggle",
        children: [
          /* @__PURE__ */ u3(Icon, {
            name: "circle-help",
            size: 16
          }, undefined, false, undefined, this),
          /* @__PURE__ */ u3("span", {
            children: "Legend"
          }, undefined, false, undefined, this)
        ]
      }, undefined, true, undefined, this),
      /* @__PURE__ */ u3("div", {
        class: "legend-body",
        children: [
          /* @__PURE__ */ u3("h4", {
            children: "Parts"
          }, undefined, false, undefined, this),
          /* @__PURE__ */ u3("ul", {
            class: "legend-kinds",
            children: Object.entries(LAYER).map(([key, v]) => /* @__PURE__ */ u3("li", {
              children: [
                /* @__PURE__ */ u3("span", {
                  class: "legend-chip",
                  style: hueOf(key),
                  children: /* @__PURE__ */ u3(Icon, {
                    name: v.icon,
                    size: 17
                  }, undefined, false, undefined, this)
                }, undefined, false, undefined, this),
                /* @__PURE__ */ u3("span", {
                  children: [
                    /* @__PURE__ */ u3("b", {
                      children: v.name
                    }, undefined, false, undefined, this),
                    /* @__PURE__ */ u3("span", {
                      children: v.what
                    }, undefined, false, undefined, this)
                  ]
                }, undefined, true, undefined, this)
              ]
            }, key, true, undefined, this))
          }, undefined, false, undefined, this),
          /* @__PURE__ */ u3("h4", {
            children: "Wires"
          }, undefined, false, undefined, this),
          /* @__PURE__ */ u3("ul", {
            class: "legend-marks",
            children: [
              /* @__PURE__ */ u3("li", {
                children: [
                  /* @__PURE__ */ u3("svg", {
                    width: "42",
                    height: "14",
                    "aria-hidden": "true",
                    children: /* @__PURE__ */ u3("line", {
                      x1: "2",
                      y1: "7",
                      x2: "40",
                      y2: "7",
                      stroke: "var(--line-strong)",
                      "stroke-width": "3"
                    }, undefined, false, undefined, this)
                  }, undefined, false, undefined, this),
                  /* @__PURE__ */ u3("span", {
                    children: [
                      /* @__PURE__ */ u3("b", {
                        children: "Thicker"
                      }, undefined, false, undefined, this),
                      " · more imports"
                    ]
                  }, undefined, true, undefined, this)
                ]
              }, undefined, true, undefined, this),
              /* @__PURE__ */ u3("li", {
                children: [
                  /* @__PURE__ */ u3("svg", {
                    width: "42",
                    height: "14",
                    "aria-hidden": "true",
                    children: /* @__PURE__ */ u3("line", {
                      x1: "2",
                      y1: "7",
                      x2: "40",
                      y2: "7",
                      stroke: "var(--line-strong)",
                      "stroke-width": "1.4",
                      "stroke-dasharray": "6 5"
                    }, undefined, false, undefined, this)
                  }, undefined, false, undefined, this),
                  /* @__PURE__ */ u3("span", {
                    children: [
                      /* @__PURE__ */ u3("b", {
                        children: "Dashed"
                      }, undefined, false, undefined, this),
                      " · described, but nothing imports it"
                    ]
                  }, undefined, true, undefined, this)
                ]
              }, undefined, true, undefined, this),
              /* @__PURE__ */ u3("li", {
                children: [
                  /* @__PURE__ */ u3("span", {
                    class: "legend-warn",
                    children: /* @__PURE__ */ u3(Icon, {
                      name: "triangle-alert",
                      size: 16
                    }, undefined, false, undefined, this)
                  }, undefined, false, undefined, this),
                  /* @__PURE__ */ u3("span", {
                    children: [
                      /* @__PURE__ */ u3("b", {
                        children: "Warning"
                      }, undefined, false, undefined, this),
                      " · the description is older than the code"
                    ]
                  }, undefined, true, undefined, this)
                ]
              }, undefined, true, undefined, this)
            ]
          }, undefined, true, undefined, this),
          /* @__PURE__ */ u3("p", {
            class: "legend-foot",
            children: "Drag to pan · scroll to zoom · click a part"
          }, undefined, false, undefined, this)
        ]
      }, undefined, true, undefined, this)
    ]
  }, undefined, true, undefined, this);
}
function Overview({ payload, onPick, onClose }) {
  const order = ["edge", "tool", "core", "store", "surface"];
  const byLayer = order.map((layer) => ({ layer, parts: payload.maps.filter((m) => (m.layer ?? "core") === layer) })).filter((group) => group.parts.length > 0);
  const entries = payload.flow.nodes.filter((n) => !payload.flow.edges.some((e) => e.to === n.id)).map((n) => n.id);
  return /* @__PURE__ */ u3("aside", {
    class: "map-detail map-overview",
    "aria-label": "Overview",
    children: [
      /* @__PURE__ */ u3("div", {
        class: "map-detail-head",
        children: [
          /* @__PURE__ */ u3("h3", {
            children: "Overview"
          }, undefined, false, undefined, this),
          /* @__PURE__ */ u3("button", {
            type: "button",
            class: "icon-button",
            onClick: onClose,
            "aria-label": "Close",
            children: /* @__PURE__ */ u3(Icon, {
              name: "close",
              size: 17
            }, undefined, false, undefined, this)
          }, undefined, false, undefined, this)
        ]
      }, undefined, true, undefined, this),
      /* @__PURE__ */ u3("p", {
        class: "detail-prose",
        children: [
          plural(payload.maps.length, "part"),
          " over ",
          plural(payload.files, "file"),
          ".",
          entries.length > 0 && /* @__PURE__ */ u3(S, {
            children: [
              " Starts at ",
              entries.slice(0, 3).map((e, i) => /* @__PURE__ */ u3(S, {
                children: [
                  i > 0 && ", ",
                  /* @__PURE__ */ u3("b", {
                    children: e
                  }, undefined, false, undefined, this)
                ]
              }, undefined, true, undefined, this)),
              "."
            ]
          }, undefined, true, undefined, this)
        ]
      }, undefined, true, undefined, this),
      byLayer.map(({ layer, parts }) => /* @__PURE__ */ u3("section", {
        class: "detail-section overview-layer",
        children: [
          /* @__PURE__ */ u3("h3", {
            children: [
              /* @__PURE__ */ u3("span", {
                class: "overview-icon",
                style: hueOf(layer),
                children: /* @__PURE__ */ u3(Icon, {
                  name: iconOf(layer),
                  size: 15
                }, undefined, false, undefined, this)
              }, undefined, false, undefined, this),
              LAYER[layer].name
            ]
          }, undefined, true, undefined, this),
          /* @__PURE__ */ u3("ul", {
            class: "map-links",
            children: parts.map((m) => /* @__PURE__ */ u3("li", {
              children: [
                /* @__PURE__ */ u3("button", {
                  type: "button",
                  onClick: () => onPick(m.part),
                  children: [
                    m.part,
                    m.stale && /* @__PURE__ */ u3(Icon, {
                      name: "triangle-alert",
                      size: 13
                    }, undefined, false, undefined, this)
                  ]
                }, undefined, true, undefined, this),
                /* @__PURE__ */ u3("span", {
                  children: m.does
                }, undefined, false, undefined, this)
              ]
            }, m.part, true, undefined, this))
          }, undefined, false, undefined, this)
        ]
      }, layer, true, undefined, this))
    ]
  }, undefined, true, undefined, this);
}
function Detail({ part, payload, onClose, onPick }) {
  const map = payload.maps.find((m) => m.part === part);
  const node = payload.flow.nodes.find((n) => n.id === part);
  return /* @__PURE__ */ u3("aside", {
    class: "map-detail",
    "aria-label": part,
    children: [
      /* @__PURE__ */ u3("div", {
        class: "map-detail-head",
        children: [
          /* @__PURE__ */ u3("span", {
            class: "map-detail-layer",
            style: hueOf(map?.layer ?? node?.layer ?? "core")
          }, undefined, false, undefined, this),
          /* @__PURE__ */ u3("h3", {
            children: part
          }, undefined, false, undefined, this),
          /* @__PURE__ */ u3("button", {
            type: "button",
            class: "icon-button",
            onClick: onClose,
            "aria-label": "Close",
            children: /* @__PURE__ */ u3(Icon, {
              name: "close",
              size: 17
            }, undefined, false, undefined, this)
          }, undefined, false, undefined, this)
        ]
      }, undefined, true, undefined, this),
      map && /* @__PURE__ */ u3("p", {
        class: "detail-prose",
        children: map.does
      }, undefined, false, undefined, this),
      node && /* @__PURE__ */ u3("p", {
        class: "map-detail-sum",
        children: [
          plural(node.files.length, "file"),
          node.lines > 0 && /* @__PURE__ */ u3(S, {
            children: [
              " · ",
              node.lines.toLocaleString(),
              " lines"
            ]
          }, undefined, true, undefined, this),
          node.attempts > 0 && /* @__PURE__ */ u3(S, {
            children: [
              " · ",
              plural(node.attempts, "attempt")
            ]
          }, undefined, true, undefined, this),
          node.abandoned > 0 && /* @__PURE__ */ u3(S, {
            children: [
              " · ",
              /* @__PURE__ */ u3("b", {
                class: "is-lost-text",
                children: [
                  node.abandoned,
                  " abandoned"
                ]
              }, undefined, true, undefined, this)
            ]
          }, undefined, true, undefined, this)
        ]
      }, undefined, true, undefined, this),
      map?.stale && /* @__PURE__ */ u3("p", {
        class: "map-stale-note",
        children: [
          /* @__PURE__ */ u3(Icon, {
            name: "triangle-alert",
            size: 15
          }, undefined, false, undefined, this),
          /* @__PURE__ */ u3("span", {
            children: [
              "Described ",
              map.ts.slice(0, 10),
              "; code changed ",
              map.code_ts?.slice(0, 10),
              "."
            ]
          }, undefined, true, undefined, this)
        ]
      }, undefined, true, undefined, this),
      map && map.decisions.length > 0 && /* @__PURE__ */ u3(Field, {
        title: "Decisions",
        children: /* @__PURE__ */ u3("ul", {
          class: "ruled-out",
          children: map.decisions.map((d, i) => /* @__PURE__ */ u3("li", {
            children: [
              /* @__PURE__ */ u3("span", {
                class: "ruled-approach",
                children: d.what
              }, undefined, false, undefined, this),
              /* @__PURE__ */ u3("span", {
                class: "ruled-because",
                children: d.because
              }, undefined, false, undefined, this)
            ]
          }, i, true, undefined, this))
        }, undefined, false, undefined, this)
      }, undefined, false, undefined, this),
      map && map.reads.length > 0 && /* @__PURE__ */ u3(Field, {
        title: "Depends on",
        children: /* @__PURE__ */ u3("ul", {
          class: "map-links",
          children: map.reads.map((r) => /* @__PURE__ */ u3("li", {
            children: [
              /* @__PURE__ */ u3("button", {
                type: "button",
                onClick: () => onPick(r.part),
                children: r.part
              }, undefined, false, undefined, this),
              /* @__PURE__ */ u3("span", {
                children: r.what
              }, undefined, false, undefined, this)
            ]
          }, r.part, true, undefined, this))
        }, undefined, false, undefined, this)
      }, undefined, false, undefined, this),
      map && map.feeds.length > 0 && /* @__PURE__ */ u3(Field, {
        title: "Used by",
        children: /* @__PURE__ */ u3("ul", {
          class: "map-links",
          children: map.feeds.map((f) => /* @__PURE__ */ u3("li", {
            children: [
              /* @__PURE__ */ u3("button", {
                type: "button",
                onClick: () => onPick(f.part),
                children: f.part
              }, undefined, false, undefined, this),
              /* @__PURE__ */ u3("span", {
                children: f.what
              }, undefined, false, undefined, this)
            ]
          }, f.part, true, undefined, this))
        }, undefined, false, undefined, this)
      }, undefined, false, undefined, this),
      node && node.files.length > 0 && /* @__PURE__ */ u3(Field, {
        title: "Files",
        children: /* @__PURE__ */ u3("ul", {
          class: "map-files",
          children: node.files.slice(0, 16).map((f) => /* @__PURE__ */ u3("li", {
            children: f
          }, f, false, undefined, this))
        }, undefined, false, undefined, this)
      }, undefined, false, undefined, this),
      map && map.history.length > 0 && /* @__PURE__ */ u3("details", {
        children: [
          /* @__PURE__ */ u3("summary", {
            class: "map-history-toggle",
            children: plural(map.history.length, "earlier version")
          }, undefined, false, undefined, this),
          /* @__PURE__ */ u3(Field, {
            title: "Earlier version",
            hint: "earlier-version",
            children: /* @__PURE__ */ u3("ul", {
              class: "ruled-out",
              children: map.history.map((h) => /* @__PURE__ */ u3("li", {
                children: [
                  /* @__PURE__ */ u3("span", {
                    class: "ruled-approach",
                    children: h.ts.slice(0, 10)
                  }, undefined, false, undefined, this),
                  /* @__PURE__ */ u3("span", {
                    class: "ruled-because",
                    children: h.does
                  }, undefined, false, undefined, this)
                ]
              }, h.id, true, undefined, this))
            }, undefined, false, undefined, this)
          }, undefined, false, undefined, this)
        ]
      }, undefined, true, undefined, this)
    ]
  }, undefined, true, undefined, this);
}
function ProjectMap() {
  const [payload, setPayload] = d2(null);
  const [error, setError] = d2(false);
  const [picked, setPicked] = d2(null);
  const [overview, setOverview] = d2(true);
  h2(() => {
    getJson("/api/map", { signal: AbortSignal.timeout(20000) }).then((data) => ("error" in data) ? setError(true) : setPayload(data)).catch(() => setError(true));
  }, []);
  h2(() => {
    const onKey = (event) => {
      if (event.key === "Escape")
        setPicked(null);
    };
    addEventListener("keydown", onKey);
    return () => removeEventListener("keydown", onKey);
  }, []);
  if (error)
    return /* @__PURE__ */ u3("p", {
      class: "map-empty",
      children: "Couldn't draw the map."
    }, undefined, false, undefined, this);
  if (!payload)
    return /* @__PURE__ */ u3("p", {
      class: "map-empty",
      children: "Drawing the map…"
    }, undefined, false, undefined, this);
  const drawn = payload.flow;
  const pick = (id) => setPicked(id || null);
  const stale = payload.maps.filter((m) => m.stale).map((m) => m.part);
  return /* @__PURE__ */ u3("div", {
    class: "map",
    children: [
      stale.length > 0 && /* @__PURE__ */ u3("p", {
        class: "page-summary is-warn",
        children: stale.length === 1 ? /* @__PURE__ */ u3(S, {
          children: [
            "The description of ",
            /* @__PURE__ */ u3("b", {
              children: stale[0]
            }, undefined, false, undefined, this),
            " is older than its code."
          ]
        }, undefined, true, undefined, this) : /* @__PURE__ */ u3(S, {
          children: [
            stale.length,
            " descriptions are older than their code: ",
            stale.map((p, i) => /* @__PURE__ */ u3(S, {
              children: [
                i > 0 && ", ",
                /* @__PURE__ */ u3("b", {
                  children: p
                }, undefined, false, undefined, this)
              ]
            }, undefined, true, undefined, this)),
            "."
          ]
        }, undefined, true, undefined, this)
      }, undefined, false, undefined, this),
      drawn.nodes.length === 0 ? /* @__PURE__ */ u3(S, {
        children: [
          /* @__PURE__ */ u3(AbsorbNote, {
            what: "map"
          }, undefined, false, undefined, this),
          /* @__PURE__ */ u3("p", {
            class: "goals-empty",
            children: "Nothing mapped yet."
          }, undefined, false, undefined, this)
        ]
      }, undefined, true, undefined, this) : /* @__PURE__ */ u3("div", {
        class: "map-body",
        children: [
          /* @__PURE__ */ u3("div", {
            class: "map-main",
            children: /* @__PURE__ */ u3(Flow, {
              data: payload.flow,
              picked,
              onPick: pick
            }, undefined, false, undefined, this)
          }, undefined, false, undefined, this),
          picked ? /* @__PURE__ */ u3(Detail, {
            part: picked,
            payload,
            onClose: () => setPicked(null),
            onPick: pick
          }, undefined, false, undefined, this) : overview && /* @__PURE__ */ u3(Overview, {
            payload,
            onPick: pick,
            onClose: () => setOverview(false)
          }, undefined, false, undefined, this)
        ]
      }, undefined, true, undefined, this)
    ]
  }, undefined, true, undefined, this);
}

// server/markdown.tsx
var FENCE = /^ {0,3}(`{3,}|~{3,})/;
var HEADING = /^ {0,3}(#{1,6})\s+(.*?)(?:\s+#+)?\s*$/;
var ITEM = /^(\s*)([-*+]|\d{1,9}[.)])\s+(.*)$/;
var INLINE = /(`+)(.+?)\1(?!`)|\*\*(.+?)\*\*|(?<!\w)__(.+?)__(?!\w)|\*(?!\s)(.+?)(?<!\s)\*|(?<!\w)_(?!\s)(.+?)(?<!\s)_(?!\w)/s;
function inline(text) {
  const out = [];
  let rest = text;
  for (let m = INLINE.exec(rest);m; m = INLINE.exec(rest)) {
    if (m.index)
      out.push(rest.slice(0, m.index));
    const key = out.length;
    if (m[1])
      out.push(/* @__PURE__ */ u3("code", {
        children: m[2].replace(/^ (.*) $/s, "$1")
      }, key, false, undefined, this));
    else if (m[3] ?? m[4])
      out.push(/* @__PURE__ */ u3("strong", {
        children: inline(m[3] ?? m[4])
      }, key, false, undefined, this));
    else
      out.push(/* @__PURE__ */ u3("em", {
        children: inline(m[5] ?? m[6])
      }, key, false, undefined, this));
    rest = rest.slice(m.index + m[0].length);
  }
  if (rest)
    out.push(rest);
  return out;
}
function list(lines, key) {
  const [, indent, marker] = ITEM.exec(lines[0]);
  const items = [];
  for (const line of lines) {
    const m = ITEM.exec(line);
    const last = items.at(-1);
    if (m && m[1].length <= indent.length)
      items.push({ text: [m[3]], inner: [] });
    else if (m || last.inner.length)
      last.inner.push(line);
    else
      last.text.push(line.trim());
  }
  const body = items.map((it, i) => /* @__PURE__ */ u3("li", {
    children: [
      inline(it.text.join(" ")),
      it.inner.length > 0 && list(it.inner, 0)
    ]
  }, i, true, undefined, this));
  const start = parseInt(marker, 10);
  return Number.isNaN(start) ? /* @__PURE__ */ u3("ul", {
    children: body
  }, key, false, undefined, this) : /* @__PURE__ */ u3("ol", {
    start: start === 1 ? undefined : start,
    children: body
  }, key, false, undefined, this);
}
function markdown(text) {
  const lines = text.replace(/\r\n?/g, `
`).split(`
`);
  const out = [];
  const starts = (line) => FENCE.test(line) || HEADING.test(line);
  for (let i = 0;i < lines.length; ) {
    const line = lines[i];
    const fence = FENCE.exec(line)?.[1];
    if (fence) {
      const close = new RegExp(`^ {0,3}${fence[0]}{${fence.length},}\\s*$`);
      const body = [];
      for (i++;i < lines.length && !close.test(lines[i]); i++)
        body.push(lines[i]);
      i++;
      out.push(/* @__PURE__ */ u3("pre", {
        children: /* @__PURE__ */ u3("code", {
          children: body.join(`
`)
        }, undefined, false, undefined, this)
      }, out.length, false, undefined, this));
      continue;
    }
    const heading = HEADING.exec(line);
    if (heading) {
      const Tag = `h${Math.min(6, Math.max(4, heading[1].length + 2))}`;
      out.push(/* @__PURE__ */ u3(Tag, {
        children: inline(heading[2])
      }, out.length, false, undefined, this));
      i++;
      continue;
    }
    if (!line.trim()) {
      i++;
      continue;
    }
    const isList = ITEM.test(line);
    const block = [];
    for (;i < lines.length && lines[i].trim() && !starts(lines[i]) && (isList || !block.length || !ITEM.test(lines[i])); i++)
      block.push(lines[i]);
    out.push(isList ? list(block, out.length) : /* @__PURE__ */ u3("p", {
      children: inline(block.map((l) => l.trim()).join(" "))
    }, out.length, false, undefined, this));
  }
  return out;
}

// server/rules.tsx
var where = (r) => r.source ? `${r.source.path}${r.source.heading ? ` › ${r.source.heading}` : ""}` : "Kept in ANVC";
var draftOf = (r) => ({
  name: r?.name ?? "",
  applies: r?.applies.join(", ") ?? "",
  kind: r && !r.source ? "here" : "file",
  file: r?.source?.path ?? "AGENTS.md",
  heading: r?.source?.heading ?? "",
  text: r && !r.source ? r.text ?? "" : ""
});
function RuleForm({ start, onSave, onCancel }) {
  const [d, setD] = d2(() => draftOf(start));
  const set = (patch) => setD({ ...d, ...patch });
  const input = (key, label, placeholder) => /* @__PURE__ */ u3("label", {
    children: [
      /* @__PURE__ */ u3("span", {
        children: label
      }, undefined, false, undefined, this),
      /* @__PURE__ */ u3("input", {
        value: d[key],
        placeholder,
        onInput: (e) => set({ [key]: e.currentTarget.value })
      }, undefined, false, undefined, this)
    ]
  }, undefined, true, undefined, this);
  return /* @__PURE__ */ u3("form", {
    class: "rule-form",
    onSubmit: (e) => {
      e.preventDefault();
      onSave(d);
    },
    children: [
      input("name", "Name", "Commit messages"),
      input("applies", "Applies to", "README.md, docs/**/*.md, or commit"),
      /* @__PURE__ */ u3("div", {
        class: "rule-form-where",
        children: [
          /* @__PURE__ */ u3("span", {
            children: "Rules are in"
          }, undefined, false, undefined, this),
          /* @__PURE__ */ u3(Segmented, {
            label: "Rules are in",
            value: d.kind,
            onChange: (kind) => set({ kind }),
            options: [["file", "A file"], ["here", "Written here"]]
          }, undefined, false, undefined, this)
        ]
      }, undefined, true, undefined, this),
      d.kind === "file" ? /* @__PURE__ */ u3("div", {
        class: "rule-form-pair",
        children: [
          input("file", "File", "AGENTS.md"),
          input("heading", "Heading", "Commit messages")
        ]
      }, undefined, true, undefined, this) : /* @__PURE__ */ u3("label", {
        children: [
          /* @__PURE__ */ u3("span", {
            children: "Rules"
          }, undefined, false, undefined, this),
          /* @__PURE__ */ u3("textarea", {
            rows: 7,
            value: d.text,
            onInput: (e) => set({ text: e.currentTarget.value })
          }, undefined, false, undefined, this)
        ]
      }, undefined, true, undefined, this),
      /* @__PURE__ */ u3("div", {
        class: "rule-actions",
        children: [
          /* @__PURE__ */ u3("button", {
            type: "submit",
            class: "button primary",
            children: "Save"
          }, undefined, false, undefined, this),
          /* @__PURE__ */ u3("button", {
            type: "button",
            class: "button",
            onClick: onCancel,
            children: "Cancel"
          }, undefined, false, undefined, this)
        ]
      }, undefined, true, undefined, this)
    ]
  }, undefined, true, undefined, this);
}
function Rules() {
  const [rules, setRules] = d2(null);
  const [files, setFiles] = d2([]);
  const [editing, setEditing] = d2(null);
  const [error, setError] = d2("");
  h2(() => {
    getJson("/api/rules").then((v) => {
      setFiles(v.files ?? []);
      v.rules ? setRules(v.rules) : setError(v.error ?? "Couldn't load the writing rules");
    }).catch(() => setError("Couldn't load the writing rules"));
  }, []);
  const post = async (body) => {
    const r = await send("/api/rules", body);
    const out = await r.json().catch(() => ({}));
    if (!r.ok || out.error) {
      setError(out.error ?? "Couldn't save");
      return;
    }
    setError("");
    setRules(out.rules);
    setEditing(null);
  };
  const save = (id) => (d) => void post({
    action: id ? "change" : "add",
    id,
    name: d.name,
    applies: d.applies,
    ...d.kind === "here" ? { text: d.text } : { from: `${d.file}${d.heading.trim() ? `#${d.heading}` : ""}` }
  });
  const remove = (r) => {
    if (confirm(`Remove "${r.name}"? Agents stop getting these rules.`))
      post({ action: "remove", id: r.id });
  };
  return /* @__PURE__ */ u3("section", {
    class: "rules",
    "aria-labelledby": "rules-heading",
    children: [
      /* @__PURE__ */ u3("div", {
        class: "rules-head",
        children: [
          /* @__PURE__ */ u3("h2", {
            id: "rules-heading",
            children: "Writing rules"
          }, undefined, false, undefined, this),
          rules && editing !== "new" && /* @__PURE__ */ u3("button", {
            type: "button",
            class: "button",
            onClick: () => setEditing("new"),
            children: [
              /* @__PURE__ */ u3(Icon, {
                name: "plus",
                size: 14
              }, undefined, false, undefined, this),
              "Add rule set"
            ]
          }, undefined, true, undefined, this)
        ]
      }, undefined, true, undefined, this),
      /* @__PURE__ */ u3(AbsorbNote, {
        what: "rules"
      }, undefined, false, undefined, this),
      rules?.length === 0 && editing !== "new" && /* @__PURE__ */ u3("p", {
        class: "rules-empty",
        children: "No rule sets in ANVC yet. A rule set points at rules you already wrote, such as a heading in AGENTS.md. Your agent then gets them just before it writes what they cover, such as a commit message."
      }, undefined, false, undefined, this),
      editing === "new" && /* @__PURE__ */ u3(RuleForm, {
        onSave: save(null),
        onCancel: () => setEditing(null)
      }, undefined, false, undefined, this),
      rules && rules.length > 0 && /* @__PURE__ */ u3("div", {
        class: "rule-list",
        children: rules.map((r) => editing === r.id ? /* @__PURE__ */ u3(RuleForm, {
          start: r,
          onSave: save(r.id),
          onCancel: () => setEditing(null)
        }, r.id, false, undefined, this) : /* @__PURE__ */ u3("details", {
          class: "rule",
          children: [
            /* @__PURE__ */ u3("summary", {
              children: [
                /* @__PURE__ */ u3("b", {
                  children: r.name
                }, undefined, false, undefined, this),
                /* @__PURE__ */ u3("span", {
                  class: "rule-applies",
                  children: r.applies.map((a) => /* @__PURE__ */ u3("code", {
                    children: a
                  }, a, false, undefined, this))
                }, undefined, false, undefined, this),
                /* @__PURE__ */ u3("span", {
                  class: `rule-where${r.missing ? " is-missing" : ""}`,
                  children: [
                    where(r),
                    r.missing && " · not found"
                  ]
                }, undefined, true, undefined, this),
                r.remote && /* @__PURE__ */ u3("span", {
                  class: "rule-from",
                  children: [
                    "From ",
                    r.remote
                  ]
                }, undefined, true, undefined, this)
              ]
            }, undefined, true, undefined, this),
            r.missing ? /* @__PURE__ */ u3("p", {
              class: "rule-missing",
              children: r.missing
            }, undefined, false, undefined, this) : /* @__PURE__ */ u3("div", {
              class: "rule-text md",
              children: markdown(r.text ?? "")
            }, undefined, false, undefined, this),
            /* @__PURE__ */ u3("div", {
              class: "rule-actions",
              children: [
                /* @__PURE__ */ u3("button", {
                  type: "button",
                  class: "button",
                  onClick: () => setEditing(r.id),
                  children: "Edit"
                }, undefined, false, undefined, this),
                /* @__PURE__ */ u3("button", {
                  type: "button",
                  class: "button",
                  onClick: () => remove(r),
                  children: "Remove"
                }, undefined, false, undefined, this)
              ]
            }, undefined, true, undefined, this)
          ]
        }, r.id, true, undefined, this))
      }, undefined, false, undefined, this),
      files.length > 0 && /* @__PURE__ */ u3(S, {
        children: [
          /* @__PURE__ */ u3("h3", {
            class: "rules-files-head",
            children: "Your own rule files"
          }, undefined, false, undefined, this),
          /* @__PURE__ */ u3("p", {
            class: "rules-files-sub",
            children: "Your agent already reads these. ANVC shows them here as they are."
          }, undefined, false, undefined, this),
          /* @__PURE__ */ u3("div", {
            class: "rule-list",
            children: files.map((f) => /* @__PURE__ */ u3("details", {
              class: "rule",
              children: [
                /* @__PURE__ */ u3("summary", {
                  children: [
                    /* @__PURE__ */ u3("b", {
                      children: /* @__PURE__ */ u3("code", {
                        children: f.path
                      }, undefined, false, undefined, this)
                    }, undefined, false, undefined, this),
                    /* @__PURE__ */ u3("span", {
                      class: "rule-where",
                      children: f.scope === "everywhere" ? "Your global file" : "This repository's"
                    }, undefined, false, undefined, this)
                  ]
                }, undefined, true, undefined, this),
                /* @__PURE__ */ u3("div", {
                  class: "rule-text md",
                  children: markdown(f.text)
                }, undefined, false, undefined, this)
              ]
            }, f.path, true, undefined, this))
          }, undefined, false, undefined, this)
        ]
      }, undefined, true, undefined, this),
      error && /* @__PURE__ */ u3("p", {
        class: "settings-status is-error",
        role: "alert",
        children: error
      }, undefined, false, undefined, this)
    ]
  }, undefined, true, undefined, this);
}

// server/status.tsx
var STANDS = {
  uncommitted: "Not committed",
  local: "Only on this computer",
  main: "In main",
  pushed: "Pushed",
  released: "Released",
  unknown: "Commit not found"
};
function day2(ts) {
  const d = new Date(ts);
  const today = new Date;
  if (d.toDateString() === today.toDateString())
    return d.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
  if (d.toDateString() === new Date(today.getTime() - 86400000).toDateString())
    return "Yesterday";
  return d.toLocaleDateString(undefined, { day: "numeric", month: "short" });
}
function ItemForm({ submit, item, goals, onSave, onCancel }) {
  const [goal, setGoal] = d2(item?.goal ?? "");
  return /* @__PURE__ */ u3(TitleForm, {
    label: "Item",
    placeholder: "What's next",
    submit,
    initial: item?.title,
    changed: goal !== (item?.goal ?? ""),
    onSave: (title) => onSave(title, goal || null),
    onCancel,
    children: Object.keys(goals).length > 0 && /* @__PURE__ */ u3("select", {
      value: goal,
      onChange: (e) => setGoal(e.currentTarget.value),
      "aria-label": "Goal",
      children: [
        /* @__PURE__ */ u3("option", {
          value: "",
          children: "No goal"
        }, undefined, false, undefined, this),
        Object.entries(goals).map(([id, t]) => /* @__PURE__ */ u3("option", {
          value: id,
          children: t
        }, id, false, undefined, this))
      ]
    }, undefined, true, undefined, this)
  }, undefined, false, undefined, this);
}
function Title({ item, goals }) {
  return /* @__PURE__ */ u3("span", {
    class: "status-title",
    children: [
      item.from ? `“${item.title}”` : item.title,
      item.goal && goals[item.goal] && /* @__PURE__ */ u3("small", {
        children: [
          "for ",
          goals[item.goal]
        ]
      }, undefined, true, undefined, this)
    ]
  }, undefined, true, undefined, this);
}
function NowRow({ w, goals }) {
  const who = w.subagent ? `${w.subagent} subagent` : w.agent;
  return /* @__PURE__ */ u3("li", {
    class: "status-row",
    children: [
      /* @__PURE__ */ u3("span", {
        class: `status-title${w.title ? "" : " is-empty"}`,
        children: [
          w.source === "prompt" || w.from ? `“${w.title}”` : w.title ?? "No task stated",
          w.goal && goals[w.goal] && /* @__PURE__ */ u3("small", {
            children: [
              "for ",
              goals[w.goal]
            ]
          }, undefined, true, undefined, this)
        ]
      }, undefined, true, undefined, this),
      /* @__PURE__ */ u3("span", {
        class: "status-meta",
        children: [
          w.from ? `From ${w.from}` : who,
          !w.live && w.agent !== "You" ? ", not running" : ""
        ]
      }, undefined, true, undefined, this),
      /* @__PURE__ */ u3("time", {
        class: "status-meta",
        dateTime: w.since,
        children: [
          "since ",
          day2(w.since)
        ]
      }, undefined, true, undefined, this)
    ]
  }, undefined, true, undefined, this);
}
function DoneRow({ f, goals }) {
  return /* @__PURE__ */ u3("li", {
    class: "status-row",
    children: [
      /* @__PURE__ */ u3(Title, {
        item: f,
        goals
      }, undefined, false, undefined, this),
      /* @__PURE__ */ u3("time", {
        class: "status-meta",
        dateTime: f.ts,
        children: day2(f.ts)
      }, undefined, false, undefined, this),
      /* @__PURE__ */ u3("span", {
        class: `status-stand is-${f.stands ?? "none"}`,
        title: f.commit ?? undefined,
        children: f.stands === "released" && f.tag ? `Released in ${f.tag}` : f.stands ? STANDS[f.stands] : ""
      }, undefined, false, undefined, this)
    ]
  }, undefined, true, undefined, this);
}
function NextRow({ item, first, last, goals, save }) {
  const [editing, setEditing] = d2(false);
  if (editing) {
    return /* @__PURE__ */ u3("li", {
      class: "status-row is-editing",
      children: /* @__PURE__ */ u3(ItemForm, {
        submit: "Save",
        item,
        goals,
        onCancel: () => setEditing(false),
        onSave: (title, goal) => void save({ id: item.id, title, goal }).then((ok) => ok && setEditing(false))
      }, undefined, false, undefined, this)
    }, undefined, false, undefined, this);
  }
  return /* @__PURE__ */ u3("li", {
    class: "status-row",
    children: [
      /* @__PURE__ */ u3(Title, {
        item,
        goals
      }, undefined, false, undefined, this),
      /* @__PURE__ */ u3("span", {
        class: "status-actions",
        children: [
          /* @__PURE__ */ u3("button", {
            type: "button",
            class: "icon-button",
            "aria-label": "Move up",
            title: "Move up",
            disabled: first,
            onClick: () => void save({ id: item.id, move: "up" }),
            children: /* @__PURE__ */ u3(Icon, {
              name: "chevron-up"
            }, undefined, false, undefined, this)
          }, undefined, false, undefined, this),
          /* @__PURE__ */ u3("button", {
            type: "button",
            class: "icon-button",
            "aria-label": "Move down",
            title: "Move down",
            disabled: last,
            onClick: () => void save({ id: item.id, move: "down" }),
            children: /* @__PURE__ */ u3(Icon, {
              name: "chevron-down"
            }, undefined, false, undefined, this)
          }, undefined, false, undefined, this),
          /* @__PURE__ */ u3("button", {
            type: "button",
            class: "icon-button",
            "aria-label": "Edit",
            title: "Edit",
            onClick: () => setEditing(true),
            children: /* @__PURE__ */ u3(Icon, {
              name: "pencil"
            }, undefined, false, undefined, this)
          }, undefined, false, undefined, this),
          /* @__PURE__ */ u3("button", {
            type: "button",
            class: "icon-button",
            "aria-label": "Drop",
            title: "Drop",
            onClick: () => void save({ id: item.id, state: "dropped" }),
            children: /* @__PURE__ */ u3(Icon, {
              name: "close"
            }, undefined, false, undefined, this)
          }, undefined, false, undefined, this)
        ]
      }, undefined, true, undefined, this)
    ]
  }, undefined, true, undefined, this);
}
function Status() {
  const { data: status, error, save } = useLive("/api/status");
  const [adding, setAdding] = d2(false);
  if (!status)
    return null;
  const { now, done, next, goals } = status;
  return /* @__PURE__ */ u3("section", {
    class: "status",
    children: [
      /* @__PURE__ */ u3("h2", {
        children: "Status"
      }, undefined, false, undefined, this),
      error && /* @__PURE__ */ u3("p", {
        class: "settings-status is-error",
        children: error
      }, undefined, false, undefined, this),
      /* @__PURE__ */ u3("div", {
        class: "status-list",
        children: [
          /* @__PURE__ */ u3("h3", {
            children: "In progress"
          }, undefined, false, undefined, this),
          now.length ? /* @__PURE__ */ u3("ul", {
            children: now.map((w, i) => /* @__PURE__ */ u3(NowRow, {
              w,
              goals
            }, `${w.session}-${w.item ?? w.since}-${i}`, false, undefined, this))
          }, undefined, false, undefined, this) : /* @__PURE__ */ u3("p", {
            class: "status-empty",
            children: "Nothing's running."
          }, undefined, false, undefined, this)
        ]
      }, undefined, true, undefined, this),
      /* @__PURE__ */ u3("div", {
        class: "status-list",
        children: [
          /* @__PURE__ */ u3("h3", {
            children: "Done recently"
          }, undefined, false, undefined, this),
          done.length ? /* @__PURE__ */ u3("ul", {
            children: done.map((f) => /* @__PURE__ */ u3(DoneRow, {
              f,
              goals
            }, f.id, false, undefined, this))
          }, undefined, false, undefined, this) : /* @__PURE__ */ u3("p", {
            class: "status-empty",
            children: "Nothing finished yet."
          }, undefined, false, undefined, this)
        ]
      }, undefined, true, undefined, this),
      /* @__PURE__ */ u3("div", {
        class: "status-list",
        children: [
          /* @__PURE__ */ u3("header", {
            children: [
              /* @__PURE__ */ u3("h3", {
                children: "Up next"
              }, undefined, false, undefined, this),
              !adding && /* @__PURE__ */ u3("button", {
                type: "button",
                class: "button",
                onClick: () => setAdding(true),
                children: [
                  /* @__PURE__ */ u3(Icon, {
                    name: "plus",
                    size: 14
                  }, undefined, false, undefined, this),
                  "Add"
                ]
              }, undefined, true, undefined, this)
            ]
          }, undefined, true, undefined, this),
          adding && /* @__PURE__ */ u3(ItemForm, {
            submit: "Add",
            goals,
            onCancel: () => setAdding(false),
            onSave: (title, goal) => void save({ title, goal }).then((ok) => ok && setAdding(false))
          }, undefined, false, undefined, this),
          next.length ? /* @__PURE__ */ u3("ul", {
            children: next.map((item, i) => /* @__PURE__ */ u3(NextRow, {
              item,
              first: i === 0,
              last: i === next.length - 1,
              goals,
              save
            }, item.id, false, undefined, this))
          }, undefined, false, undefined, this) : !adding && /* @__PURE__ */ u3("p", {
            class: "status-empty",
            children: "Nothing queued."
          }, undefined, false, undefined, this)
        ]
      }, undefined, true, undefined, this)
    ]
  }, undefined, true, undefined, this);
}

// server/tools.tsx
var KINDS = [["mcp", "MCP servers"], ["plugin", "Plugins"], ["skill", "Skills"], ["command", "Commands"], ["hook", "Hooks"]];
var STATE = { on: "On", off: "Off", unknown: "Unknown" };
function unknownWhy(agent, t) {
  if (agent === "cursor" && t.kind === "mcp")
    return "Cursor keeps this switch in its own settings.";
  if (agent === "codex" && t.kind === "hook")
    return "Codex runs a hook once you've reviewed it with /hooks.";
  if (agent === "claude-code" && t.kind === "mcp")
    return "Claude Code asks before it runs a server from .mcp.json.";
  return "The config files don't say.";
}
var whereLabel = (where) => where === "every project" ? "Every project" : where === "this project" ? "This project" : `${where} plugin`;
function details(t) {
  return [
    t.events?.length ? `On ${t.events.join(", ")}` : "",
    t.runs ? `Runs ${t.runs}` : "",
    t.env?.length ? `Environment: ${t.env.join(", ")}` : "",
    t.headers?.length ? `Headers: ${t.headers.join(", ")}` : "",
    t.file
  ].filter(Boolean).join(`
`);
}
function Note({ tool, note, onSave, onDone }) {
  const [text, setText] = d2(note ? null : "");
  const [error, setError] = d2("");
  const close = () => {
    setText(note ? null : "");
    setError("");
    if (!note)
      onDone();
  };
  const save = async () => {
    const failed = await onSave(tool, text ?? "");
    if (failed)
      setError(failed);
    else {
      setError("");
      onDone();
    }
  };
  if (text === null) {
    return /* @__PURE__ */ u3("button", {
      type: "button",
      class: "tool-note",
      title: note.remote ? `From ${note.remote}` : "Edit",
      onClick: () => setText(note.when),
      children: note.remote ? /* @__PURE__ */ u3(S, {
        children: [
          "“",
          note.when,
          "” ",
          /* @__PURE__ */ u3("small", {
            children: [
              "from ",
              note.remote
            ]
          }, undefined, true, undefined, this)
        ]
      }, undefined, true, undefined, this) : note.when
    }, undefined, false, undefined, this);
  }
  return /* @__PURE__ */ u3("form", {
    class: "tool-note-edit",
    onSubmit: (e) => {
      e.preventDefault();
      save();
    },
    children: [
      /* @__PURE__ */ u3("input", {
        "aria-label": `When to use ${tool}`,
        placeholder: "When to use it",
        maxLength: 300,
        value: text,
        autoFocus: true,
        onInput: (e) => setText(e.currentTarget.value),
        onKeyDown: (e) => {
          if (e.key === "Escape")
            close();
        }
      }, undefined, false, undefined, this),
      /* @__PURE__ */ u3("button", {
        type: "submit",
        class: "button primary",
        disabled: !text.trim(),
        children: "Save"
      }, undefined, false, undefined, this),
      /* @__PURE__ */ u3("button", {
        type: "button",
        class: "button",
        onClick: close,
        children: "Cancel"
      }, undefined, false, undefined, this),
      error && /* @__PURE__ */ u3("span", {
        class: "tool-note-error",
        role: "alert",
        children: error
      }, undefined, false, undefined, this)
    ]
  }, undefined, true, undefined, this);
}
function Tools() {
  const [view, setView] = d2(null);
  const [error, setError] = d2("");
  const [picked, setPicked] = d2(null);
  h2(() => {
    getJson("/api/tools").then((v) => v.error ? setError(v.error) : setView(v)).catch(() => setError("Couldn't load tools."));
  }, []);
  const saveNote = async (tool, when) => {
    try {
      const out = await (await send("/api/tools", { tool, when })).json();
      if (out.error)
        return out.error;
      setView(out);
      return null;
    } catch {
      return "Couldn't save.";
    }
  };
  if (!view)
    return error ? /* @__PURE__ */ u3("section", {
      class: "tools-section",
      children: [
        /* @__PURE__ */ u3("h2", {
          children: "Tools"
        }, undefined, false, undefined, this),
        /* @__PURE__ */ u3("p", {
          class: "tools-empty",
          children: error
        }, undefined, false, undefined, this)
      ]
    }, undefined, true, undefined, this) : null;
  const noteFor = new Map(view.notes.map((n) => [n.tool.toLowerCase(), n]));
  const named = new Set(view.agents.flatMap((a) => a.tools.map((t) => t.name.toLowerCase())));
  const others = view.notes.filter((n) => !named.has(n.tool.toLowerCase()));
  const keyOf = (agent, t) => `${agent}:${t.kind}:${t.name}:${t.where}:${t.file}`;
  return /* @__PURE__ */ u3("section", {
    class: "tools-section",
    children: [
      /* @__PURE__ */ u3("h2", {
        children: "Tools"
      }, undefined, false, undefined, this),
      /* @__PURE__ */ u3("p", {
        class: "tools-sub",
        children: "Click a tool to add a note."
      }, undefined, false, undefined, this),
      /* @__PURE__ */ u3("div", {
        class: "tools-grid",
        children: [
          view.agents.map((a) => /* @__PURE__ */ u3("div", {
            class: "tools-agent",
            children: [
              /* @__PURE__ */ u3("h3", {
                children: a.name
              }, undefined, false, undefined, this),
              !a.tools.length && /* @__PURE__ */ u3("p", {
                class: "tools-empty",
                children: "None found."
              }, undefined, false, undefined, this),
              KINDS.map(([kind, label]) => {
                const tools = a.tools.filter((t) => t.kind === kind);
                if (!tools.length)
                  return null;
                const open = tools.find((t) => keyOf(a.agent, t) === picked);
                const noted = tools.filter((t) => noteFor.has(t.name.toLowerCase()) && t !== open);
                return /* @__PURE__ */ u3("div", {
                  class: "tools-kind",
                  children: [
                    /* @__PURE__ */ u3("h4", {
                      children: label
                    }, undefined, false, undefined, this),
                    /* @__PURE__ */ u3("div", {
                      class: "tool-chips",
                      children: tools.map((t) => {
                        const key = keyOf(a.agent, t);
                        const state = STATE[t.state] + (t.state === "unknown" ? `: ${unknownWhy(a.agent, t)}` : "");
                        return /* @__PURE__ */ u3("button", {
                          type: "button",
                          class: `tool-chip is-${t.state}${key === picked ? " is-open" : ""}`,
                          "aria-expanded": key === picked,
                          title: [state, whereLabel(t.where), details(t)].join(`
`),
                          onClick: () => setPicked(key === picked ? null : key),
                          children: [
                            /* @__PURE__ */ u3("span", {
                              class: "tool-dot",
                              "aria-label": STATE[t.state]
                            }, undefined, false, undefined, this),
                            t.name,
                            t.anvc && /* @__PURE__ */ u3("span", {
                              class: "tool-anvc",
                              children: "ANVC"
                            }, undefined, false, undefined, this)
                          ]
                        }, key, true, undefined, this);
                      })
                    }, undefined, false, undefined, this),
                    open && /* @__PURE__ */ u3("div", {
                      class: "tool-picked",
                      children: [
                        /* @__PURE__ */ u3("p", {
                          children: [
                            /* @__PURE__ */ u3("b", {
                              children: open.name
                            }, undefined, false, undefined, this),
                            " · ",
                            STATE[open.state],
                            " · ",
                            whereLabel(open.where),
                            open.runs ? /* @__PURE__ */ u3(S, {
                              children: [
                                " · ",
                                /* @__PURE__ */ u3("code", {
                                  children: open.runs
                                }, undefined, false, undefined, this)
                              ]
                            }, undefined, true, undefined, this) : null
                          ]
                        }, undefined, true, undefined, this),
                        /* @__PURE__ */ u3(Note, {
                          tool: open.name,
                          note: noteFor.get(open.name.toLowerCase()),
                          onSave: saveNote,
                          onDone: () => setPicked(null)
                        }, picked, false, undefined, this)
                      ]
                    }, undefined, true, undefined, this),
                    noted.length > 0 && /* @__PURE__ */ u3("ul", {
                      class: "tool-notes",
                      children: noted.map((t) => /* @__PURE__ */ u3("li", {
                        children: [
                          /* @__PURE__ */ u3("b", {
                            children: t.name
                          }, undefined, false, undefined, this),
                          " ",
                          noteFor.get(t.name.toLowerCase()).when
                        ]
                      }, keyOf(a.agent, t), true, undefined, this))
                    }, undefined, false, undefined, this)
                  ]
                }, kind, true, undefined, this);
              })
            ]
          }, a.agent, true, undefined, this)),
          others.length > 0 && /* @__PURE__ */ u3("div", {
            class: "tools-agent",
            children: [
              /* @__PURE__ */ u3("h3", {
                children: "Other notes"
              }, undefined, false, undefined, this),
              /* @__PURE__ */ u3("ul", {
                class: "tool-notes",
                children: others.map((n) => /* @__PURE__ */ u3("li", {
                  children: [
                    /* @__PURE__ */ u3("b", {
                      children: n.tool
                    }, undefined, false, undefined, this),
                    " ",
                    n.remote ? /* @__PURE__ */ u3(S, {
                      children: [
                        "“",
                        n.when,
                        "” ",
                        /* @__PURE__ */ u3("small", {
                          children: [
                            "from ",
                            n.remote
                          ]
                        }, undefined, true, undefined, this)
                      ]
                    }, undefined, true, undefined, this) : n.when
                  ]
                }, n.id, true, undefined, this))
              }, undefined, false, undefined, this)
            ]
          }, undefined, true, undefined, this)
        ]
      }, undefined, true, undefined, this)
    ]
  }, undefined, true, undefined, this);
}

// server/project.tsx
var TABS = [["map", "Map"], ["status", "Status"], ["goals", "Goals"], ["rules", "Writing rules"], ["tools", "Tools"]];
var saved = () => {
  try {
    const t = localStorage.getItem("anvc.project.tab");
    return TABS.some(([id]) => id === t) ? t : "map";
  } catch {
    return "map";
  }
};
function ProjectPage() {
  const [tab, setTab] = d2(saved);
  const pick = (t) => {
    setTab(t);
    try {
      localStorage.setItem("anvc.project.tab", t);
    } catch {}
  };
  return /* @__PURE__ */ u3("div", {
    class: "project-page",
    children: [
      /* @__PURE__ */ u3("div", {
        class: "filterbar",
        children: [
          /* @__PURE__ */ u3("div", {
            class: "filter-tabs",
            role: "tablist",
            "aria-label": "Project",
            children: TABS.map(([id, label]) => /* @__PURE__ */ u3("button", {
              type: "button",
              role: "tab",
              "aria-selected": tab === id,
              class: tab === id ? "current" : "",
              onClick: () => pick(id),
              children: label
            }, id, false, undefined, this))
          }, undefined, false, undefined, this),
          /* @__PURE__ */ u3("span", {
            class: "project-info",
            children: /* @__PURE__ */ u3(Hint, {
              id: `project-${tab}`
            }, undefined, false, undefined, this)
          }, undefined, false, undefined, this)
        ]
      }, undefined, true, undefined, this),
      /* @__PURE__ */ u3("div", {
        class: "project-panel",
        role: "tabpanel",
        children: [
          tab === "map" && /* @__PURE__ */ u3(ProjectMap, {}, undefined, false, undefined, this),
          tab === "status" && /* @__PURE__ */ u3(Status, {}, undefined, false, undefined, this),
          tab === "goals" && /* @__PURE__ */ u3(Goals, {}, undefined, false, undefined, this),
          tab === "rules" && /* @__PURE__ */ u3(Rules, {}, undefined, false, undefined, this),
          tab === "tools" && /* @__PURE__ */ u3(Tools, {}, undefined, false, undefined, this)
        ]
      }, undefined, true, undefined, this)
    ]
  }, undefined, true, undefined, this);
}

// server/work-model.ts
var inOutcome = (turn, outcome) => outcome === "all" || (outcome === "unexplained" ? !turn.authored : turn.status === outcome);
function turnTitle(turn) {
  if (turn.authored && turn.intent.trim())
    return turn.intent;
  const names = turn.filesWritten.map((path) => path.split("/").pop());
  if (names.length === 1)
    return `Changed ${names[0]}`;
  if (names.length > 1)
    return `Changed ${names[0]} and ${plural(names.length - 1, "other file")}`;
  if (turn.shells)
    return `Ran ${plural(turn.shells, "command")}`;
  if (turn.reads)
    return `Read ${plural(turn.reads, "file")}`;
  return "Untitled attempt";
}
function filterTurns(turns, query, outcome, session) {
  const terms = query.trim().toLocaleLowerCase().split(/\s+/).filter(Boolean);
  return turns.filter((turn) => {
    const text = [
      turnTitle(turn),
      turn.intent,
      turn.why,
      turn.run,
      ...turn.constraints,
      turn.detail?.narrative,
      turn.detail?.output,
      ...(turn.detail?.ruled_out ?? []).flatMap((item) => [item.approach, item.because]),
      ...turn.detail?.not_investigated ?? [],
      ...turn.filesWritten,
      ...turn.actions.map((action) => action.full)
    ].join(" ").toLocaleLowerCase();
    return inOutcome(turn, outcome) && (session === null || (turn.run || "unknown") === session) && terms.every((term) => text.includes(term));
  });
}
function groupSessions(turns) {
  const groups = new Map;
  for (const turn of [...turns].sort((a, b) => b.start.localeCompare(a.start))) {
    const id = turn.run || "unknown";
    if (!groups.has(id))
      groups.set(id, []);
    groups.get(id).push(turn);
  }
  return [...groups].map(([id, records]) => ({
    id,
    title: turnTitle(records.find((turn) => turn.status === "kept") ?? records[0]),
    turns: records
  }));
}
function duration(seconds) {
  const total = Math.max(0, Math.round(seconds));
  if (total < 60)
    return `${total}s`;
  if (total < 3600)
    return `${Math.floor(total / 60)}m${total % 60 ? ` ${total % 60}s` : ""}`;
  return `${Math.floor(total / 3600)}h ${Math.floor(total % 3600 / 60)}m`;
}
function fileLink(forge, path, commit) {
  if (path.startsWith("/") || path.split("/").includes(".."))
    return null;
  return `${forge}/blob/${commit ?? "HEAD"}/${path.split("/").map(encodeURIComponent).join("/")}`;
}

// server/example-work.ts
function exampleWork() {
  const now = Date.now();
  const turn = (id, minutes, fields) => ({
    id: `example-${id}`,
    ref: `example/${id}`,
    tier: "shared",
    retired: null,
    run: "retrieval",
    start: new Date(now - minutes * 60000).toISOString(),
    seconds: 0,
    status: "kept",
    intent: "",
    authored: true,
    anchorCommit: null,
    parent: null,
    supersedes: null,
    replacedBy: null,
    openDeadEnd: false,
    why: null,
    constraints: [],
    recheck: null,
    detail: null,
    reads: 0,
    writes: 0,
    shells: 0,
    filesWritten: [],
    actions: [],
    ...fields
  });
  const turns = [
    turn(1, 12, {
      intent: "Hide dead ends once a later attempt resolves them",
      parent: "example-2",
      seconds: 840,
      reads: 2,
      writes: 2,
      filesWritten: ["protocol/query.ts", "emitters/claude-code/inject.ts"],
      why: "Follow the parent chain before showing a dead end. If later work replaced it, show the result instead of warning the next agent away from a solved path.",
      constraints: ["Keep the original record intact", "Show the warning only when it still applies"],
      actions: [
        { at: 0, kind: "read", label: "protocol/query.ts", full: "Read how open dead ends are selected from the record index." },
        { at: 165, kind: "read", label: "emitters/claude-code/inject.ts", full: "Trace which records reach the file-open hook." },
        { at: 430, kind: "write", label: "protocol/query.ts", full: "Exclude dead ends that later work resolved." },
        { at: 705, kind: "write", label: "emitters/claude-code/inject.ts", full: "Use the resolved set when composing file hints." }
      ]
    }),
    turn(2, 34, {
      intent: "Match old failures to the file being opened",
      parent: "example-3",
      status: "abandoned",
      seconds: 510,
      reads: 2,
      writes: 1,
      filesWritten: ["emitters/claude-code/inject.ts"],
      why: "A path match says the old attempt touched the file, but says nothing about whether the problem still exists. It surfaced a warning for work that had already been replaced.",
      recheck: "bun test tests/inject.test.ts",
      detail: {
        narrative: "Opening inject.ts brought back a warning about an approach that a later attempt had already replaced. Matching on the path found the right file but the wrong record.",
        output: `$ bun test tests/inject.test.ts
(fail) a resolved dead end is not repeated on file open
  expected context to be null
  received "Work on emitters/claude-code/inject.ts that was abandoned: ..."

 22 pass
 1 fail`,
        ruled_out: [
          { approach: "Hide warnings older than a week", because: "Age says nothing about whether the problem was fixed. Old warnings can still be true." },
          { approach: "Match on file content hash", because: "Any unrelated edit to the file would hide a warning that still applies." }
        ],
        not_investigated: ["Whether renamed files keep their warnings"]
      },
      actions: [
        { at: 0, kind: "read", label: "emitters/claude-code/inject.ts", full: "Inspect the file-open matching rule." },
        { at: 210, kind: "write", label: "emitters/claude-code/inject.ts", full: "Try matching prior failures by touched path." },
        { at: 465, kind: "read", label: "protocol/query.ts", full: "Found a successor record, but the path-only hint remained visible." }
      ]
    }),
    turn(3, 51, {
      intent: "Find why a resolved warning still appears",
      seconds: 390,
      reads: 2,
      why: "The hook matched the file correctly. The query did not check whether a later record had replaced the failure.",
      actions: [
        { at: 0, kind: "read", label: "emitters/claude-code/inject.ts", full: "Follow the file-open hook from path lookup to injected text." },
        { at: 185, kind: "read", label: "protocol/query.ts", full: "Compare the returned dead end with its successor record." }
      ]
    }),
    turn(4, 190, {
      run: "capture",
      intent: "Keep the command output behind each captured step",
      parent: "example-5",
      seconds: 720,
      reads: 2,
      writes: 2,
      filesWritten: ["emitters/claude-code/capture.ts", "protocol/ingest.ts"],
      why: "The capture now carries relevant output alongside the command. A later reader can see what failed without reconstructing the session.",
      actions: [
        { at: 0, kind: "read", label: "emitters/claude-code/capture.ts", full: "Inspect the transcript fields available for command results." },
        { at: 275, kind: "write", label: "emitters/claude-code/capture.ts", full: "Retain the command and its returned output in the captured step." },
        { at: 560, kind: "write", label: "protocol/ingest.ts", full: "Carry that evidence into the stored record." }
      ]
    }),
    turn(5, 214, {
      run: "capture",
      intent: "Record command success as a single flag",
      status: "abandoned",
      seconds: 330,
      reads: 2,
      writes: 1,
      filesWritten: ["emitters/claude-code/capture.ts"],
      why: "A pass or fail flag hides the message that explains the failure. Keep the output itself, with the command that produced it.",
      detail: {
        output: `step 14  bun test  exit 1
(the flag was all that was stored; the failing test name was lost)`,
        not_investigated: ["How much output to keep for very long test runs"]
      },
      actions: [
        { at: 0, kind: "read", label: "emitters/claude-code/capture.ts", full: "Check what the command result hook records." },
        { at: 145, kind: "write", label: "emitters/claude-code/capture.ts", full: "Try storing only the command status." },
        { at: 285, kind: "read", label: "protocol/ingest.ts", full: "The ingested step could say that it failed, but not why." }
      ]
    }),
    turn(6, 1460, {
      run: "lineage",
      intent: "Link a discarded approach to what replaced it",
      seconds: 670,
      reads: 1,
      writes: 2,
      filesWritten: ["protocol/record.ts", "protocol/query.ts"],
      why: "The next attempt can name its parent. Readers can follow an abandoned approach forward to the work that superseded it.",
      actions: [
        { at: 0, kind: "read", label: "protocol/record.ts", full: "Find the parent field in the checkpoint envelope." },
        { at: 205, kind: "write", label: "protocol/record.ts", full: "Accept a parent ID when writing the next attempt." },
        { at: 490, kind: "write", label: "protocol/query.ts", full: "Resolve both sides of the parent link for readers." }
      ]
    })
  ];
  return {
    name: "anvc (sample)",
    forge: null,
    turns,
    stats: { records: turns.length, abandoned: 2, sessions: 3 }
  };
}

// server/faq.tsx
var QUESTIONS = [
  ["What does ANVC save?", /* @__PURE__ */ u3(S, {
    children: [
      "What your agent tried in this repository: each attempt's goal, whether it worked, and why it ended, kept as a small git ref. It also keeps a log of the commands, output and files of each session, and a copy of the session, in ",
      /* @__PURE__ */ u3("code", {
        children: "~/.anvc"
      }, undefined, false, undefined, this),
      " on this computer."
    ]
  }, undefined, true, undefined, this)],
  ["Does anything leave my computer?", /* @__PURE__ */ u3(S, {
    children: [
      "Shared records go to your own remote when you ",
      /* @__PURE__ */ u3("code", {
        children: "git push"
      }, undefined, false, undefined, this),
      ", and nothing is sent to ANVC's authors. If you set up ",
      /* @__PURE__ */ u3("code", {
        children: "anvc sync"
      }, undefined, false, undefined, this),
      ", your private history also goes to a remote only you can read. Once a day ANVC checks for an update: a git clone runs ",
      /* @__PURE__ */ u3("code", {
        children: "git fetch"
      }, undefined, false, undefined, this),
      " on its own folder, and the plugin asks GitHub for the newest release's version number."
    ]
  }, undefined, true, undefined, this)],
  ["Who can read my records?", /* @__PURE__ */ u3(S, {
    children: "Anyone who can fetch the repository can read its shared records. Private records aren't pushed with your code, and in a project that's Local only, every record is private."
  }, undefined, false, undefined, this)],
  ["Will records clutter my GitHub?", /* @__PURE__ */ u3(S, {
    children: [
      "No. They're refs under ",
      /* @__PURE__ */ u3("code", {
        children: "refs/anvc"
      }, undefined, false, undefined, this),
      ", which don't show up as branches, commits or files."
    ]
  }, undefined, true, undefined, this)],
  ["Does it save my passwords or API keys?", /* @__PURE__ */ u3(S, {
    children: "Passwords, API keys and tokens it recognises are removed before anything is written, in the log and in records. It finds them by their shape, so one it doesn't recognise can get through."
  }, undefined, false, undefined, this)],
  ["Does it wear out my SSD?", /* @__PURE__ */ u3(S, {
    children: "It writes only what your agent adds. A session's copy grows by just the new part, measured at 0.15 MB for an hour of a long session, and a record is at most 64 KiB."
  }, undefined, false, undefined, this)],
  ["How much disk space does it use?", /* @__PURE__ */ u3(S, {
    children: "About 170 MB after ten days of daily use, most of it copies of sessions. To stop keeping them, turn off Saved sessions in Settings, under Raw log."
  }, undefined, false, undefined, this)],
  ["Does it slow my agent down?", /* @__PURE__ */ u3(S, {
    children: "In a repository with about 100 records, the hooks took 36 ms before each tool call and 13 ms after it. Whatever ANVC tells the agent at once stays under 9,000 characters."
  }, undefined, false, undefined, this)],
  ["I turned ANVC on in a project I'd already worked on. Can it catch up?", /* @__PURE__ */ u3(S, {
    children: [
      "Yes. The first session after, your agent asks whether to import the earlier sessions, then offers to record the numbers already in your files. The empty work log has a button for the import, and in a terminal ",
      /* @__PURE__ */ u3("code", {
        children: "anvc catch-up"
      }, undefined, false, undefined, this),
      " does it and lists those files."
    ]
  }, undefined, true, undefined, this)],
  ["Can an old record mislead my agent?", /* @__PURE__ */ u3(S, {
    children: "It can, so each record is shown with when it was written, and a dead end's check can run first to see if it still fails. A record that's no longer true can be retired, and then it isn't shown."
  }, undefined, false, undefined, this)],
  ["How do my teammates get my records?", /* @__PURE__ */ u3(S, {
    children: [
      "They set ANVC up in their own clone. After that, ",
      /* @__PURE__ */ u3("code", {
        children: "git fetch"
      }, undefined, false, undefined, this),
      " and ",
      /* @__PURE__ */ u3("code", {
        children: "git pull"
      }, undefined, false, undefined, this),
      " bring your shared records, and their agents are shown them."
    ]
  }, undefined, true, undefined, this)],
  ["How do I turn it off or remove it?", /* @__PURE__ */ u3(S, {
    children: [
      "Turn a folder off on the Folders page, or with ",
      /* @__PURE__ */ u3("code", {
        children: "anvc off"
      }, undefined, false, undefined, this),
      ". Remove ANVC, in Settings, backs up the project's records to a file and then deletes them. ",
      /* @__PURE__ */ u3("code", {
        children: "anvc uninstall"
      }, undefined, false, undefined, this),
      " takes out only what setup added."
    ]
  }, undefined, true, undefined, this)],
  ["Which agents does it work with?", /* @__PURE__ */ u3(S, {
    children: [
      "Claude Code, Codex and Cursor. Claude Code can install it as a plugin, and the others through ",
      /* @__PURE__ */ u3("code", {
        children: "bun run setup"
      }, undefined, false, undefined, this),
      " in a clone of ANVC."
    ]
  }, undefined, true, undefined, this)],
  ["Is it free?", /* @__PURE__ */ u3(S, {
    children: "Yes. It's open source, under the Apache 2.0 license."
  }, undefined, false, undefined, this)]
];
function FaqPage() {
  return /* @__PURE__ */ u3("div", {
    class: "faq",
    children: QUESTIONS.map(([q, a]) => /* @__PURE__ */ u3("section", {
      children: [
        /* @__PURE__ */ u3("h2", {
          children: q
        }, undefined, false, undefined, this),
        /* @__PURE__ */ u3("p", {
          children: a
        }, undefined, false, undefined, this)
      ]
    }, q, true, undefined, this))
  }, undefined, false, undefined, this);
}

// server/ui.tsx
var POLL_MS = 1e4;
var EMPTY = {
  forge: null,
  turns: [],
  stats: { records: 0, sessions: 0, abandoned: 0 }
};
var FILTERS2 = [
  { value: "all", label: "All" },
  { value: "kept", label: "Kept" },
  { value: "abandoned", label: "Abandoned" },
  { value: "unexplained", label: "No reason" }
];
var DAY = new Intl.DateTimeFormat(undefined, { weekday: "long", month: "long", day: "numeric" });
var PAGES = [
  ["project", "target", "Project"],
  ["results", "database", "Results"],
  ["stats", "chart-column", "Stats"],
  ["folders", "folder", "Folders"]
];
var TITLE2 = {
  project: "Project",
  work: "Work log",
  results: "Results and sources",
  stats: "Stats",
  settings: "Settings",
  folders: "Folders",
  faq: "Questions"
};
var pickedMode = () => {
  try {
    const m = localStorage.getItem("anvc.mode");
    return m === "light" || m === "dark" ? m : null;
  } catch {
    return null;
  }
};
var systemMode = () => matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark";
var showMode = (m) => {
  document.documentElement.dataset.mode = m;
};
showMode(pickedMode() ?? systemMode());
function ModeButton() {
  const [mode, setMode] = d2(() => pickedMode() ?? systemMode());
  h2(() => {
    const media = matchMedia("(prefers-color-scheme: light)");
    const follow = () => {
      if (!pickedMode()) {
        const m = systemMode();
        showMode(m);
        setMode(m);
      }
    };
    media.addEventListener("change", follow);
    return () => media.removeEventListener("change", follow);
  }, []);
  const next = mode === "dark" ? "light" : "dark";
  return /* @__PURE__ */ u3("button", {
    class: "nav-item",
    type: "button",
    "aria-label": `Switch to ${next} mode`,
    title: `Switch to ${next} mode`,
    onClick: () => {
      showMode(next);
      setMode(next);
      try {
        localStorage.setItem("anvc.mode", next);
      } catch {}
    },
    children: [
      /* @__PURE__ */ u3(Icon, {
        name: mode === "dark" ? "moon" : "sun"
      }, undefined, false, undefined, this),
      /* @__PURE__ */ u3("span", {
        children: [
          "Mode: ",
          mode === "dark" ? "Dark" : "Light"
        ]
      }, undefined, true, undefined, this)
    ]
  }, undefined, true, undefined, this);
}
var SIDEBAR_MIN = 180;
var SIDEBAR_MAX = 420;
var SIDEBAR_DEFAULT = 240;
var clampSidebar = (w) => Math.round(Math.min(SIDEBAR_MAX, Math.max(SIDEBAR_MIN, w)));
function SetupStep({ install }) {
  if (install.managed === "plugin")
    return /* @__PURE__ */ u3(S, {
      children: [
        /* @__PURE__ */ u3("p", {
          children: "In Claude Code, run this in your project. Your agent goes through the settings with you."
        }, undefined, false, undefined, this),
        /* @__PURE__ */ u3(Copy, {
          text: "/anvc:setup"
        }, undefined, false, undefined, this),
        /* @__PURE__ */ u3("p", {
          children: "Codex and Cursor need ANVC from a clone of its repository: github.com/yodering/anvc."
        }, undefined, false, undefined, this)
      ]
    }, undefined, true, undefined, this);
  if (install.managed === "desktop")
    return /* @__PURE__ */ u3(S, {
      children: [
        /* @__PURE__ */ u3("p", {
          children: [
            "In Claude Code, install the plugin, then run ",
            /* @__PURE__ */ u3("code", {
              children: "/anvc:setup"
            }, undefined, false, undefined, this),
            " in your project."
          ]
        }, undefined, true, undefined, this),
        /* @__PURE__ */ u3(Copy, {
          text: "/plugin marketplace add yodering/anvc"
        }, undefined, false, undefined, this),
        /* @__PURE__ */ u3(Copy, {
          text: "/plugin install anvc@anvc"
        }, undefined, false, undefined, this),
        /* @__PURE__ */ u3("p", {
          children: [
            "For another agent, run ",
            /* @__PURE__ */ u3("code", {
              children: "bun run setup"
            }, undefined, false, undefined, this),
            " from the ANVC folder you built this app in."
          ]
        }, undefined, true, undefined, this)
      ]
    }, undefined, true, undefined, this);
  return /* @__PURE__ */ u3(S, {
    children: [
      /* @__PURE__ */ u3("p", {
        children: "Run this from your ANVC folder. It prints the config for your agent."
      }, undefined, false, undefined, this),
      /* @__PURE__ */ u3("div", {
        class: "copy-block",
        children: /* @__PURE__ */ u3("code", {
          children: [
            "bun run setup ",
            install.repo,
            " --agent <your agent>"
          ]
        }, undefined, true, undefined, this)
      }, undefined, false, undefined, this)
    ]
  }, undefined, true, undefined, this);
}
function Setup({ open, onClose }) {
  const install = useInstall();
  return /* @__PURE__ */ u3(Modal, {
    open,
    onClose,
    class: "setup-dialog",
    "aria-labelledby": "setup-title",
    children: [
      /* @__PURE__ */ u3("div", {
        class: "dialog-head",
        children: /* @__PURE__ */ u3("button", {
          class: "icon-button",
          "aria-label": "Close setup",
          onClick: onClose,
          children: /* @__PURE__ */ u3(Icon, {
            name: "close"
          }, undefined, false, undefined, this)
        }, undefined, false, undefined, this)
      }, undefined, false, undefined, this),
      /* @__PURE__ */ u3("h2", {
        id: "setup-title",
        children: "Connect an agent"
      }, undefined, false, undefined, this),
      /* @__PURE__ */ u3("ol", {
        class: "setup-steps",
        children: [
          /* @__PURE__ */ u3("li", {
            children: /* @__PURE__ */ u3("div", {
              children: [
                /* @__PURE__ */ u3("h3", {
                  children: "Set it up"
                }, undefined, false, undefined, this),
                install && /* @__PURE__ */ u3(SetupStep, {
                  install
                }, undefined, false, undefined, this)
              ]
            }, undefined, true, undefined, this)
          }, undefined, false, undefined, this),
          /* @__PURE__ */ u3("li", {
            children: /* @__PURE__ */ u3("div", {
              children: [
                /* @__PURE__ */ u3("h3", {
                  children: "Record work"
                }, undefined, false, undefined, this),
                /* @__PURE__ */ u3("p", {
                  children: "Setup tells your agent to do this. To ask it directly:"
                }, undefined, false, undefined, this),
                /* @__PURE__ */ u3(Copy, {
                  text: "Record this attempt with anvc_checkpoint."
                }, undefined, false, undefined, this)
              ]
            }, undefined, true, undefined, this)
          }, undefined, false, undefined, this)
        ]
      }, undefined, true, undefined, this),
      install && /* @__PURE__ */ u3("div", {
        class: "setup-note",
        children: [
          /* @__PURE__ */ u3(Icon, {
            name: "file-text"
          }, undefined, false, undefined, this),
          /* @__PURE__ */ u3("p", {
            children: [
              "To turn captured sessions into records, run",
              " ",
              /* @__PURE__ */ u3("code", {
                children: anvc(install, "ingest")
              }, undefined, false, undefined, this),
              install.managed === "desktop" && " from your ANVC folder",
              "."
            ]
          }, undefined, true, undefined, this)
        ]
      }, undefined, true, undefined, this),
      /* @__PURE__ */ u3("button", {
        class: "button primary",
        onClick: onClose,
        children: "Done"
      }, undefined, false, undefined, this)
    ]
  }, undefined, true, undefined, this);
}
function Version() {
  const v = useInstall();
  const [run, setRun] = d2({ busy: false });
  if (!v)
    return null;
  const status = run.text ?? (v.behind ? `${plural(v.behind, "update")} ready` : v.hooksBehind ? "Hooks here are out of date" : v.managed === "desktop" ? "Desktop app" : v.error ? "Couldn't check for updates" : v.checked ? "Up to date" : null);
  const act = !run.text && (v.behind > 0 || v.hooksBehind);
  const updateNow = async () => {
    setRun({ busy: true, text: "Checking for updates…" });
    try {
      const r = await (await send("/api/update", {})).json();
      const lines = (r.lines ?? [r.error ?? ""]).join(`
`);
      if (!r.ok)
        return setRun({ busy: false, text: "Couldn't update", lines });
      if (!r.restart)
        return setRun({ busy: false, text: r.changed ? "Updated. Restart your agents to use it." : "Up to date", lines });
      setRun({ busy: true, text: "Updated. Reloading…", lines });
      for (let i = 0;i < 60; i++) {
        await new Promise((ok) => setTimeout(ok, 1000));
        if (await fetch("/api/version").then((res) => res.ok, () => false))
          return location.reload();
      }
      setRun({ busy: false, text: "Updated. Run bun run ui to open the new version.", lines });
    } catch {
      setRun({ busy: false, text: "Couldn't update" });
    }
  };
  return /* @__PURE__ */ u3("div", {
    class: `version${act ? " is-behind" : ""}`,
    title: run.lines || (v.changes.length ? v.changes.map((c) => `• ${c}`).join(`
`) : undefined),
    children: [
      /* @__PURE__ */ u3("span", {
        children: [
          "ANVC ",
          v.version,
          " beta"
        ]
      }, undefined, true, undefined, this),
      status && /* @__PURE__ */ u3("span", {
        class: "version-status",
        role: "status",
        children: status
      }, undefined, false, undefined, this),
      /* @__PURE__ */ u3("button", {
        type: "button",
        class: "link-button version-update",
        onClick: updateNow,
        disabled: run.busy,
        children: run.busy ? "Updating…" : status === "Up to date" ? "Check again" : "Update"
      }, undefined, false, undefined, this)
    ]
  }, undefined, true, undefined, this);
}
function Welcome({
  on,
  again,
  onTurnOn,
  onSetup,
  onExample,
  onImported
}) {
  const [start, setStart] = d2(null);
  const [importing, setImporting] = d2(false);
  const [said, setSaid] = d2("");
  h2(() => {
    getJson("/api/start").then(setStart).catch(() => {});
  }, [again]);
  const importEarlier = async () => {
    setImporting(true);
    try {
      const done = await (await send("/api/start", {})).json();
      if (done.error)
        setSaid(`Couldn't import: ${done.error}`);
      else if (done.written) {
        setSaid(`Imported ${plural(done.written, "record")} from ${plural(done.sessions ?? 0, "session")}.`);
        onImported();
      } else
        setSaid("Those sessions had nothing to import.");
      getJson("/api/start").then(setStart).catch(() => {});
    } catch {
      setSaid("Couldn't reach the ANVC server.");
    } finally {
      setImporting(false);
    }
  };
  const example = /* @__PURE__ */ u3("button", {
    class: "button",
    onClick: onExample,
    children: [
      "View example",
      /* @__PURE__ */ u3(Icon, {
        name: "arrow-right"
      }, undefined, false, undefined, this)
    ]
  }, undefined, true, undefined, this);
  if (on === false)
    return /* @__PURE__ */ u3("div", {
      class: "welcome",
      children: [
        /* @__PURE__ */ u3("h2", {
          children: "ANVC is off for this project"
        }, undefined, false, undefined, this),
        /* @__PURE__ */ u3("p", {
          children: "Nothing is saved here or shown to agents."
        }, undefined, false, undefined, this),
        /* @__PURE__ */ u3("div", {
          class: "welcome-actions",
          children: [
            /* @__PURE__ */ u3("button", {
              class: "button primary",
              onClick: onTurnOn,
              children: "Turn on"
            }, undefined, false, undefined, this),
            example
          ]
        }, undefined, true, undefined, this)
      ]
    }, undefined, true, undefined, this);
  const connected = start && start.agents.length > 0;
  const earlier = start?.earlier ? /* @__PURE__ */ u3("button", {
    class: `button${connected ? " primary" : ""}`,
    onClick: importEarlier,
    disabled: importing,
    children: importing ? "Importing…" : `Import ${plural(start.earlier, "earlier session")}`
  }, undefined, false, undefined, this) : null;
  return /* @__PURE__ */ u3("div", {
    class: "welcome",
    children: [
      /* @__PURE__ */ u3("h2", {
        children: "Nothing recorded yet"
      }, undefined, false, undefined, this),
      start && /* @__PURE__ */ u3("p", {
        children: connected ? "ANVC is on. Records appear here when your agent saves its work or a session ends." : "Connect an agent to start."
      }, undefined, false, undefined, this),
      start && /* @__PURE__ */ u3("div", {
        class: "welcome-actions",
        children: [
          !connected && /* @__PURE__ */ u3("button", {
            class: "button primary",
            onClick: onSetup,
            children: [
              /* @__PURE__ */ u3(Icon, {
                name: "plus"
              }, undefined, false, undefined, this),
              "Connect an agent"
            ]
          }, undefined, true, undefined, this),
          earlier,
          example
        ]
      }, undefined, true, undefined, this),
      said && /* @__PURE__ */ u3("p", {
        class: "welcome-said",
        role: "status",
        children: said
      }, undefined, false, undefined, this)
    ]
  }, undefined, true, undefined, this);
}
function TurnRow({
  turn,
  selected,
  onSelect
}) {
  return /* @__PURE__ */ u3("button", {
    class: `work-row${selected ? " selected" : ""}`,
    onClick: onSelect,
    "aria-pressed": selected,
    "aria-controls": "attempt-detail",
    "data-turn-id": turn.id,
    children: [
      /* @__PURE__ */ u3("span", {
        class: `row-mark ${turn.status === "abandoned" ? "abandoned" : "kept"}`,
        children: /* @__PURE__ */ u3(Icon, {
          name: turn.status === "abandoned" ? "circle-x" : "circle-check",
          size: 18
        }, undefined, false, undefined, this)
      }, undefined, false, undefined, this),
      /* @__PURE__ */ u3("span", {
        class: "row-content",
        children: [
          /* @__PURE__ */ u3("span", {
            class: "row-title",
            children: turnTitle(turn)
          }, undefined, false, undefined, this),
          turn.why && /* @__PURE__ */ u3("span", {
            class: `row-why${turn.status === "abandoned" ? " is-lost" : ""}`,
            children: [
              /* @__PURE__ */ u3("b", {
                children: "Why"
              }, undefined, false, undefined, this),
              /* @__PURE__ */ u3("span", {
                children: turn.why
              }, undefined, false, undefined, this)
            ]
          }, undefined, true, undefined, this),
          !turn.authored && /* @__PURE__ */ u3("span", {
            class: "row-why is-missing",
            children: [
              /* @__PURE__ */ u3("b", {
                children: "Why"
              }, undefined, false, undefined, this),
              /* @__PURE__ */ u3("span", {
                children: "Your agent didn't say."
              }, undefined, false, undefined, this)
            ]
          }, undefined, true, undefined, this),
          /* @__PURE__ */ u3("span", {
            class: "row-meta",
            children: [
              turn.filesWritten.length > 0 && /* @__PURE__ */ u3("span", {
                class: "meta-item",
                title: `Files it changed:
${turn.filesWritten.slice(0, 20).join(`
`)}`,
                children: [
                  /* @__PURE__ */ u3(Icon, {
                    name: "file-text",
                    size: 13
                  }, undefined, false, undefined, this),
                  changedLine(turn.filesWritten)
                ]
              }, undefined, true, undefined, this),
              turn.seconds > 5 && /* @__PURE__ */ u3("span", {
                class: "meta-item",
                title: "How long it took",
                children: [
                  /* @__PURE__ */ u3(Icon, {
                    name: "clock",
                    size: 13
                  }, undefined, false, undefined, this),
                  "took ",
                  duration(turn.seconds)
                ]
              }, undefined, true, undefined, this),
              turn.tier === "private" && /* @__PURE__ */ u3("span", {
                class: "meta-item row-private",
                title: "Kept only on this computer. Rows without this are shared: they go out with git push once sharing is on.",
                children: [
                  /* @__PURE__ */ u3(Icon, {
                    name: "hard-drive",
                    size: 13
                  }, undefined, false, undefined, this),
                  "Private"
                ]
              }, undefined, true, undefined, this),
              turn.retired && /* @__PURE__ */ u3("span", {
                class: "meta-pill",
                title: "No longer shown to agents",
                children: "Retired"
              }, undefined, false, undefined, this),
              turn.replacedBy && /* @__PURE__ */ u3("span", {
                class: "meta-pill",
                title: "A later version replaced this",
                children: "Replaced"
              }, undefined, false, undefined, this),
              turn.openDeadEnd && /* @__PURE__ */ u3("span", {
                class: "meta-pill is-open",
                title: "Nobody has tried this again since it was abandoned",
                children: "Not tried again"
              }, undefined, false, undefined, this)
            ]
          }, undefined, true, undefined, this)
        ]
      }, undefined, true, undefined, this)
    ]
  }, undefined, true, undefined, this);
}
function changedLine(paths) {
  const files = plural(paths.length, "file");
  const dirs = [...new Set(paths.map((p) => p.includes("/") ? `${p.split("/")[0]}/` : ""))];
  if (dirs.includes(""))
    return files;
  return `${files} in ${dirs.length > 2 ? `${dirs.slice(0, 2).join(", ")} and ${dirs.length - 2} more` : dirs.join(" and ")}`;
}
function AttemptDetail({
  turn,
  turns,
  forge,
  onSelect,
  onClose,
  onSession
}) {
  const install = useInstall();
  const find = (id) => id ? turns.filter((t) => t.id === id) : [];
  const retries = [
    ...find(turn.parent).map((other) => ({ label: "Retried after", other })),
    ...turns.filter((t) => t.parent === turn.id).map((other) => ({ label: "Retried by", other }))
  ];
  const versions = [
    ...find(turn.supersedes).map((other) => ({ label: "Replaces", other })),
    ...find(turn.replacedBy).map((other) => ({ label: "Replaced by", other }))
  ];
  const lineage = [...retries, ...versions];
  const tierCommand = install && anvc(install, `${turn.tier === "private" ? "share" : "unshare"} ${turn.id}`);
  const title = A2(null);
  const [overlay, setOverlay] = d2(() => matchMedia("(max-width: 900px)").matches);
  h2(() => {
    const media = matchMedia("(max-width: 900px)");
    const update = () => setOverlay(media.matches);
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);
  h2(() => {
    title.current?.focus({ preventScroll: true });
  }, [turn.id]);
  const content = /* @__PURE__ */ u3(S, {
    children: [
      /* @__PURE__ */ u3("div", {
        class: "detail-top",
        children: [
          /* @__PURE__ */ u3("h2", {
            ref: title,
            tabIndex: -1,
            children: turnTitle(turn)
          }, undefined, false, undefined, this),
          /* @__PURE__ */ u3("button", {
            class: "icon-button",
            onClick: onClose,
            "aria-label": "Close details",
            children: /* @__PURE__ */ u3(Icon, {
              name: "close"
            }, undefined, false, undefined, this)
          }, undefined, false, undefined, this)
        ]
      }, undefined, true, undefined, this),
      /* @__PURE__ */ u3("div", {
        class: "detail-content",
        children: [
          /* @__PURE__ */ u3(OutcomeBadge, {
            status: turn.status
          }, undefined, false, undefined, this),
          turn.why && /* @__PURE__ */ u3("div", {
            class: `reason-box ${turn.status === "abandoned" ? "abandoned" : ""}`,
            children: /* @__PURE__ */ u3("p", {
              children: turn.why
            }, undefined, false, undefined, this)
          }, undefined, false, undefined, this),
          !turn.authored && /* @__PURE__ */ u3("div", {
            class: "reason-box missing",
            children: [
              /* @__PURE__ */ u3(Icon, {
                name: "triangle-alert",
                size: 18
              }, undefined, false, undefined, this),
              /* @__PURE__ */ u3("p", {
                children: "Your agent didn't say why. ANVC saved this from the log: the commands, files and what failed."
              }, undefined, false, undefined, this)
            ]
          }, undefined, true, undefined, this),
          turn.detail?.narrative && /* @__PURE__ */ u3(Field, {
            title: "What happened",
            children: /* @__PURE__ */ u3("p", {
              class: "detail-prose",
              children: turn.detail.narrative
            }, undefined, false, undefined, this)
          }, undefined, false, undefined, this),
          turn.detail?.output && /* @__PURE__ */ u3(Field, {
            title: "Output",
            hint: "output",
            children: /* @__PURE__ */ u3("pre", {
              class: "detail-output",
              children: turn.detail.output
            }, undefined, false, undefined, this)
          }, undefined, false, undefined, this),
          (turn.detail?.ruled_out?.length ?? 0) > 0 && /* @__PURE__ */ u3(Field, {
            title: "Ruled out",
            hint: "ruled-out",
            children: /* @__PURE__ */ u3("ul", {
              class: "ruled-out",
              children: turn.detail.ruled_out.map((item) => /* @__PURE__ */ u3("li", {
                children: [
                  /* @__PURE__ */ u3("span", {
                    class: "ruled-approach",
                    children: item.approach
                  }, undefined, false, undefined, this),
                  /* @__PURE__ */ u3("span", {
                    class: "ruled-because",
                    children: item.because
                  }, undefined, false, undefined, this)
                ]
              }, item.approach, true, undefined, this))
            }, undefined, false, undefined, this)
          }, undefined, false, undefined, this),
          (turn.detail?.not_investigated?.length ?? 0) > 0 && /* @__PURE__ */ u3(Field, {
            title: "Not checked",
            hint: "not-investigated",
            children: /* @__PURE__ */ u3("ul", {
              class: "constraints open-questions",
              children: turn.detail.not_investigated.map((item) => /* @__PURE__ */ u3("li", {
                children: item
              }, item, false, undefined, this))
            }, undefined, false, undefined, this)
          }, undefined, false, undefined, this),
          turn.recheck && /* @__PURE__ */ u3(Field, {
            title: "Recheck command",
            hint: "recheck",
            children: /* @__PURE__ */ u3("code", {
              class: "recheck",
              children: turn.recheck
            }, undefined, false, undefined, this)
          }, undefined, false, undefined, this),
          (turn.detail?.commands?.length ?? 0) > 0 && /* @__PURE__ */ u3("details", {
            class: "provenance",
            children: [
              /* @__PURE__ */ u3("summary", {
                children: [
                  "Commands run · ",
                  turn.detail.commands.length
                ]
              }, undefined, true, undefined, this),
              /* @__PURE__ */ u3("pre", {
                children: turn.detail.commands.join(`
`)
              }, undefined, false, undefined, this)
            ]
          }, undefined, true, undefined, this),
          lineage.length > 0 && /* @__PURE__ */ u3(Field, {
            title: !versions.length ? "Retries" : !retries.length ? "Versions" : "Retries and versions",
            hint: retries.length ? "continued" : undefined,
            children: /* @__PURE__ */ u3("ul", {
              class: "lineage",
              children: lineage.map(({ label, other }) => /* @__PURE__ */ u3("li", {
                children: [
                  /* @__PURE__ */ u3("span", {
                    class: "lineage-label",
                    children: label
                  }, undefined, false, undefined, this),
                  /* @__PURE__ */ u3("button", {
                    class: "lineage-goal",
                    onClick: () => onSelect(other.id),
                    children: [
                      turnTitle(other),
                      /* @__PURE__ */ u3(Icon, {
                        name: "arrow-right",
                        size: 14
                      }, undefined, false, undefined, this)
                    ]
                  }, undefined, true, undefined, this),
                  /* @__PURE__ */ u3("span", {
                    class: `lineage-outcome ${other.status}`,
                    children: other.status === "abandoned" ? "abandoned" : "kept"
                  }, undefined, false, undefined, this)
                ]
              }, other.id, true, undefined, this))
            }, undefined, false, undefined, this)
          }, undefined, false, undefined, this),
          turn.constraints.length > 0 && /* @__PURE__ */ u3(Field, {
            title: "Constraints",
            children: /* @__PURE__ */ u3("ul", {
              class: "constraints",
              children: turn.constraints.map((item) => /* @__PURE__ */ u3("li", {
                children: item
              }, item, false, undefined, this))
            }, undefined, false, undefined, this)
          }, undefined, false, undefined, this),
          turn.filesWritten.length > 0 && /* @__PURE__ */ u3(Field, {
            title: `Files · ${turn.filesWritten.length}`,
            children: /* @__PURE__ */ u3("ul", {
              class: "file-list",
              children: turn.filesWritten.map((path) => {
                const href = forge ? fileLink(forge, path, turn.anchorCommit) : null;
                return /* @__PURE__ */ u3("li", {
                  children: [
                    /* @__PURE__ */ u3(Icon, {
                      name: "file-text",
                      size: 15
                    }, undefined, false, undefined, this),
                    href ? /* @__PURE__ */ u3("a", {
                      href,
                      target: "_blank",
                      rel: "noopener noreferrer",
                      children: [
                        path,
                        /* @__PURE__ */ u3(Icon, {
                          name: "external-link",
                          size: 12
                        }, undefined, false, undefined, this)
                      ]
                    }, undefined, true, undefined, this) : /* @__PURE__ */ u3("code", {
                      children: path
                    }, undefined, false, undefined, this)
                  ]
                }, path, true, undefined, this);
              })
            }, undefined, false, undefined, this)
          }, undefined, false, undefined, this),
          turn.actions.length > 0 && /* @__PURE__ */ u3(Field, {
            title: `Steps · ${turn.actions.length}`,
            hint: "steps",
            children: /* @__PURE__ */ u3(S, {
              children: [
                /* @__PURE__ */ u3(Track, {
                  actions: turn.actions,
                  seconds: turn.seconds
                }, undefined, false, undefined, this),
                /* @__PURE__ */ u3("div", {
                  class: "track-labels",
                  children: [
                    /* @__PURE__ */ u3("span", {
                      children: "0s"
                    }, undefined, false, undefined, this),
                    /* @__PURE__ */ u3("div", {
                      children: [
                        turn.actions.some((action) => action.kind === "read") && /* @__PURE__ */ u3("span", {
                          class: "read",
                          children: "Read"
                        }, undefined, false, undefined, this),
                        turn.actions.some((action) => action.kind === "write") && /* @__PURE__ */ u3("span", {
                          class: "write",
                          children: "Write"
                        }, undefined, false, undefined, this),
                        turn.actions.some((action) => action.kind === "shell") && /* @__PURE__ */ u3("span", {
                          class: "shell",
                          children: "Command"
                        }, undefined, false, undefined, this)
                      ]
                    }, undefined, true, undefined, this),
                    /* @__PURE__ */ u3("span", {
                      children: duration(turn.seconds)
                    }, undefined, false, undefined, this)
                  ]
                }, undefined, true, undefined, this),
                /* @__PURE__ */ u3("ol", {
                  class: "activity-list",
                  children: turn.actions.map((action, i) => /* @__PURE__ */ u3("li", {
                    children: [
                      /* @__PURE__ */ u3("span", {
                        class: `action-symbol ${action.kind}`,
                        children: /* @__PURE__ */ u3(Icon, {
                          name: action.kind === "read" ? "eye" : action.kind === "write" ? "pencil" : "terminal",
                          size: 14
                        }, undefined, false, undefined, this)
                      }, undefined, false, undefined, this),
                      /* @__PURE__ */ u3("details", {
                        children: [
                          /* @__PURE__ */ u3("summary", {
                            children: [
                              /* @__PURE__ */ u3("span", {
                                children: action.label
                              }, undefined, false, undefined, this),
                              /* @__PURE__ */ u3("time", {
                                children: [
                                  "+",
                                  duration(action.at)
                                ]
                              }, undefined, true, undefined, this)
                            ]
                          }, undefined, true, undefined, this),
                          /* @__PURE__ */ u3("pre", {
                            children: action.full
                          }, undefined, false, undefined, this)
                        ]
                      }, undefined, true, undefined, this)
                    ]
                  }, `${turn.id}-${i}`, true, undefined, this))
                }, undefined, false, undefined, this)
              ]
            }, undefined, true, undefined, this)
          }, undefined, false, undefined, this),
          turn.anchorCommit && /* @__PURE__ */ u3(Field, {
            title: "Commit",
            hint: "anchor",
            children: forge ? /* @__PURE__ */ u3("a", {
              class: "commit-link",
              href: `${forge}/commit/${turn.anchorCommit}`,
              target: "_blank",
              rel: "noopener noreferrer",
              children: [
                /* @__PURE__ */ u3(Icon, {
                  name: "git-commit-horizontal"
                }, undefined, false, undefined, this),
                /* @__PURE__ */ u3("code", {
                  children: turn.anchorCommit.slice(0, 12)
                }, undefined, false, undefined, this),
                /* @__PURE__ */ u3(Icon, {
                  name: "external-link",
                  size: 12
                }, undefined, false, undefined, this)
              ]
            }, undefined, true, undefined, this) : /* @__PURE__ */ u3("code", {
              children: turn.anchorCommit.slice(0, 12)
            }, undefined, false, undefined, this)
          }, undefined, false, undefined, this),
          !turn.authored && /* @__PURE__ */ u3("details", {
            class: "provenance",
            children: [
              /* @__PURE__ */ u3("summary", {
                children: "Your prompt"
              }, undefined, false, undefined, this),
              /* @__PURE__ */ u3("p", {
                children: "The agent didn't give this a title."
              }, undefined, false, undefined, this),
              /* @__PURE__ */ u3("pre", {
                children: turn.intent
              }, undefined, false, undefined, this)
            ]
          }, undefined, true, undefined, this),
          /* @__PURE__ */ u3("div", {
            class: `tier-note is-${turn.tier}`,
            children: [
              /* @__PURE__ */ u3(Icon, {
                name: turn.tier === "private" ? "lock" : "users",
                size: 17
              }, undefined, false, undefined, this),
              /* @__PURE__ */ u3("div", {
                children: [
                  /* @__PURE__ */ u3(Hint, {
                    id: turn.tier,
                    children: /* @__PURE__ */ u3("b", {
                      children: turn.tier === "private" ? "Private" : "Shared"
                    }, undefined, false, undefined, this)
                  }, undefined, false, undefined, this),
                  /* @__PURE__ */ u3("span", {
                    children: turn.tier === "private" ? "Only on this computer." : "Pushed with your code."
                  }, undefined, false, undefined, this),
                  tierCommand && /* @__PURE__ */ u3("span", {
                    class: "tier-command",
                    children: [
                      /* @__PURE__ */ u3("code", {
                        children: tierCommand
                      }, undefined, false, undefined, this),
                      /* @__PURE__ */ u3(CopyButton, {
                        text: tierCommand
                      }, undefined, false, undefined, this)
                    ]
                  }, undefined, true, undefined, this)
                ]
              }, undefined, true, undefined, this)
            ]
          }, undefined, true, undefined, this),
          /* @__PURE__ */ u3("div", {
            class: "record-metadata",
            children: [
              /* @__PURE__ */ u3("p", {
                class: "detail-time",
                children: [
                  /* @__PURE__ */ u3(Icon, {
                    name: "clock",
                    size: 14
                  }, undefined, false, undefined, this),
                  /* @__PURE__ */ u3("time", {
                    dateTime: turn.start,
                    children: new Date(turn.start).toLocaleString(undefined, {
                      month: "short",
                      day: "numeric",
                      hour: "numeric",
                      minute: "2-digit"
                    })
                  }, undefined, false, undefined, this),
                  /* @__PURE__ */ u3("span", {
                    children: "·"
                  }, undefined, false, undefined, this),
                  duration(turn.seconds)
                ]
              }, undefined, true, undefined, this),
              /* @__PURE__ */ u3(Hint, {
                id: turn.authored ? "authored" : "captured",
                children: /* @__PURE__ */ u3(Source, {
                  authored: turn.authored
                }, undefined, false, undefined, this)
              }, undefined, false, undefined, this)
            ]
          }, undefined, true, undefined, this),
          /* @__PURE__ */ u3("div", {
            class: "record-footer",
            children: [
              /* @__PURE__ */ u3("span", {
                children: "Session"
              }, undefined, false, undefined, this),
              /* @__PURE__ */ u3("code", {
                children: turn.run || "Unknown"
              }, undefined, false, undefined, this),
              turn.run && onSession && /* @__PURE__ */ u3("button", {
                type: "button",
                class: "link-button",
                onClick: () => onSession(turn.run),
                children: "Show this session"
              }, undefined, false, undefined, this)
            ]
          }, undefined, true, undefined, this)
        ]
      }, undefined, true, undefined, this)
    ]
  }, undefined, true, undefined, this);
  return overlay ? /* @__PURE__ */ u3(Modal, {
    open: true,
    onClose,
    class: "detail-panel",
    id: "attempt-detail",
    "aria-label": "Attempt details",
    children: content
  }, undefined, false, undefined, this) : /* @__PURE__ */ u3("aside", {
    class: "detail-panel",
    id: "attempt-detail",
    "aria-label": "Attempt details",
    children: content
  }, undefined, false, undefined, this);
}
function App() {
  const [repo, setRepo] = d2(EMPTY);
  const [loaded, setLoaded] = d2(false);
  const [everything, setEverything] = d2(false);
  const [error, setError] = d2(false);
  const [busy, setBusy] = d2(false);
  const [example, setExample] = d2(() => new URLSearchParams(location.search).get("example") === "1");
  const exampleData = T2(exampleWork, []);
  const [query, setQuery] = d2("");
  const [outcome, setOutcome] = d2("all");
  const [session, setSession] = d2(null);
  const [selected, setSelected] = d2(null);
  const [setup, setSetup] = d2(false);
  const [tour, setTour] = d2(false);
  const [choose, setChoose] = d2(false);
  h2(() => {
    Promise.all([getJson("/api/seen"), getJson("/api/policy"), getJson("/api/assist")]).then(([seen, p, a]) => {
      for (const key of ["tour", "choose"]) {
        try {
          if (!seen[key] && localStorage.getItem(`anvc.${key}.seen`) === "1") {
            seen[key] = true;
            send("/api/seen", { key });
          }
        } catch {}
      }
      if (!seen.tour)
        setTour(true);
      else if (!seen.choose && (p && p.chosen === false || a && a.everywhere?.from === "default"))
        setChoose(true);
    }).catch(() => {});
  }, []);
  const [page, setPage] = d2(() => new URLSearchParams(location.search).get("page") === "folders" ? "folders" : "work");
  h2(() => {
    getJson("/api/goals").then((v) => {
      if (v.goals?.length)
        setPage((p) => p === "work" ? "project" : p);
    }).catch(() => {});
  }, []);
  const [sidebarWidth, setSidebarWidth] = d2(() => {
    try {
      return clampSidebar(Number(localStorage.getItem("anvc.sidebar.width")) || SIDEBAR_DEFAULT);
    } catch {
      return SIDEBAR_DEFAULT;
    }
  });
  h2(() => {
    try {
      localStorage.setItem("anvc.sidebar.width", String(sidebarWidth));
    } catch {}
  }, [sidebarWidth]);
  const folderState = useFolders();
  const search = A2(null);
  const requesting = A2(false);
  const load = q2(async () => {
    if (requesting.current)
      return;
    requesting.current = true;
    setBusy(true);
    try {
      const data = await getJson(everything ? "/api/repo?all" : "/api/repo", { signal: AbortSignal.timeout(8000) });
      if (!Array.isArray(data.turns) || !data.stats)
        throw new Error("Invalid repository response");
      setRepo(data);
      setLoaded(true);
      setError(false);
    } catch {
      setError(true);
    } finally {
      requesting.current = false;
      setBusy(false);
    }
  }, [everything]);
  h2(() => {
    load();
    const timer = setInterval(load, POLL_MS);
    return () => clearInterval(timer);
  }, [load]);
  const data = example ? exampleData : repo;
  h2(() => {
    document.title = data.name ? `ANVC · ${data.name}` : "ANVC";
  }, [data.name]);
  const sessions = T2(() => groupSessions(data.turns), [data.turns]);
  const shown = T2(() => filterTurns(data.turns, query, outcome, session), [data.turns, query, outcome, session]);
  const scope = T2(() => filterTurns(data.turns, "", "all", session), [data.turns, session]);
  const active = shown.find((turn) => turn.id === selected);
  const count = (tab) => scope.filter((turn) => inOutcome(turn, tab)).length;
  const sessionTitle = sessions.find((item) => item.id === session)?.title;
  const reset = () => {
    setQuery("");
    setOutcome("all");
    setSession(null);
    setSelected(null);
  };
  const closeDetails = q2(() => {
    setSelected(null);
    requestAnimationFrame(() => {
      const row = [
        ...document.querySelectorAll("[data-turn-id]")
      ].find((item) => item.dataset.turnId === selected);
      row?.focus({ preventScroll: true });
    });
  }, [selected]);
  const switchExample = (value) => {
    setExample(value);
    reset();
    const url = new URL(location.href);
    if (value)
      url.searchParams.set("example", "1");
    else
      url.searchParams.delete("example");
    history.replaceState(null, "", url);
  };
  const install = useInstall();
  h2(() => {
    const onKey = (event) => {
      if (install?.managed === "desktop" && (event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "n" && !event.repeat) {
        event.preventDefault();
        send("/api/window", {});
        return;
      }
      if (setup || tour || event.metaKey || event.ctrlKey || event.altKey)
        return;
      const element = event.target;
      const editing = element.matches("input, textarea, select") || element.isContentEditable;
      if (event.key === "/" && !editing) {
        event.preventDefault();
        search.current?.focus();
      }
      if (event.key === "Escape") {
        if (active)
          closeDetails();
        else if (query)
          setQuery("");
        else if (outcome !== "all" || session)
          reset();
      }
    };
    addEventListener("keydown", onKey);
    return () => removeEventListener("keydown", onKey);
  }, [setup, tour, query, outcome, session, active, closeDetails, install?.managed]);
  return /* @__PURE__ */ u3(S, {
    children: [
      /* @__PURE__ */ u3(Sprite, {}, undefined, false, undefined, this),
      /* @__PURE__ */ u3("a", {
        class: "skip-link",
        href: "#work",
        children: "Skip to work log"
      }, undefined, false, undefined, this),
      /* @__PURE__ */ u3("div", {
        class: "workspace",
        style: { "--sidebar-w": `${sidebarWidth}px` },
        children: [
          /* @__PURE__ */ u3("aside", {
            class: "sidebar",
            "aria-label": "Workspace navigation",
            children: [
              /* @__PURE__ */ u3("div", {
                class: "sidebar-resize",
                role: "separator",
                "aria-orientation": "vertical",
                "aria-label": "Sidebar width",
                "aria-valuenow": sidebarWidth,
                "aria-valuemin": SIDEBAR_MIN,
                "aria-valuemax": SIDEBAR_MAX,
                tabIndex: 0,
                onPointerDown: (event) => {
                  event.preventDefault();
                  const move = (e) => setSidebarWidth(clampSidebar(e.clientX));
                  const up = () => {
                    removeEventListener("pointermove", move);
                    removeEventListener("pointerup", up);
                  };
                  addEventListener("pointermove", move);
                  addEventListener("pointerup", up);
                },
                onDblClick: () => setSidebarWidth(SIDEBAR_DEFAULT),
                onKeyDown: (event) => {
                  if (event.key === "ArrowLeft")
                    setSidebarWidth((w) => clampSidebar(w - 16));
                  if (event.key === "ArrowRight")
                    setSidebarWidth((w) => clampSidebar(w + 16));
                }
              }, undefined, false, undefined, this),
              /* @__PURE__ */ u3("div", {
                class: "brand",
                "data-page": page === "work" && session ? "Session" : TITLE2[page],
                children: [
                  /* @__PURE__ */ u3("span", {
                    class: "brand-symbol",
                    children: /* @__PURE__ */ u3(Icon, {
                      name: "layers",
                      size: 17
                    }, undefined, false, undefined, this)
                  }, undefined, false, undefined, this),
                  /* @__PURE__ */ u3("span", {
                    children: "anvc"
                  }, undefined, false, undefined, this)
                ]
              }, undefined, true, undefined, this),
              /* @__PURE__ */ u3("button", {
                class: `nav-item${!session && page === "work" ? " active" : ""}`,
                onClick: () => {
                  setPage("work");
                  reset();
                },
                children: [
                  /* @__PURE__ */ u3(Icon, {
                    name: "history"
                  }, undefined, false, undefined, this),
                  /* @__PURE__ */ u3("span", {
                    children: "Work log"
                  }, undefined, false, undefined, this)
                ]
              }, undefined, true, undefined, this),
              PAGES.map(([id, icon, label]) => /* @__PURE__ */ u3("button", {
                class: `nav-item${page === id ? " active" : ""}`,
                onClick: () => setPage(page === id ? "work" : id),
                children: [
                  /* @__PURE__ */ u3(Icon, {
                    name: icon
                  }, undefined, false, undefined, this),
                  /* @__PURE__ */ u3("span", {
                    children: label
                  }, undefined, false, undefined, this)
                ]
              }, id, true, undefined, this)),
              /* @__PURE__ */ u3("div", {
                class: "sidebar-bottom",
                children: [
                  /* @__PURE__ */ u3(ModeButton, {}, undefined, false, undefined, this),
                  /* @__PURE__ */ u3("button", {
                    class: `nav-item${page === "settings" ? " active" : ""}`,
                    onClick: () => setPage("settings"),
                    children: [
                      /* @__PURE__ */ u3(Icon, {
                        name: "sliders"
                      }, undefined, false, undefined, this),
                      /* @__PURE__ */ u3("span", {
                        children: "Settings"
                      }, undefined, false, undefined, this)
                    ]
                  }, undefined, true, undefined, this),
                  /* @__PURE__ */ u3("button", {
                    class: "nav-item",
                    onClick: () => setTour(true),
                    children: [
                      /* @__PURE__ */ u3(Icon, {
                        name: "circle-help"
                      }, undefined, false, undefined, this),
                      /* @__PURE__ */ u3("span", {
                        children: "How it works"
                      }, undefined, false, undefined, this)
                    ]
                  }, undefined, true, undefined, this),
                  /* @__PURE__ */ u3("button", {
                    class: `nav-item${page === "faq" ? " active" : ""}`,
                    onClick: () => setPage(page === "faq" ? "work" : "faq"),
                    children: [
                      /* @__PURE__ */ u3(Icon, {
                        name: "message-circle-question"
                      }, undefined, false, undefined, this),
                      /* @__PURE__ */ u3("span", {
                        children: "Questions"
                      }, undefined, false, undefined, this)
                    ]
                  }, undefined, true, undefined, this),
                  /* @__PURE__ */ u3("button", {
                    class: "nav-item",
                    onClick: () => setSetup(true),
                    children: [
                      /* @__PURE__ */ u3(Icon, {
                        name: "plus"
                      }, undefined, false, undefined, this),
                      /* @__PURE__ */ u3("span", {
                        children: "Connect an agent"
                      }, undefined, false, undefined, this)
                    ]
                  }, undefined, true, undefined, this),
                  /* @__PURE__ */ u3(Version, {}, undefined, false, undefined, this)
                ]
              }, undefined, true, undefined, this)
            ]
          }, undefined, true, undefined, this),
          /* @__PURE__ */ u3("main", {
            id: "work",
            class: "main",
            tabIndex: -1,
            children: [
              /* @__PURE__ */ u3("header", {
                class: "topbar",
                children: [
                  /* @__PURE__ */ u3("div", {
                    class: "breadcrumb",
                    children: [
                      /* @__PURE__ */ u3(Icon, {
                        name: "folder"
                      }, undefined, false, undefined, this),
                      /* @__PURE__ */ u3("strong", {
                        children: data.name ?? "Repository"
                      }, undefined, false, undefined, this)
                    ]
                  }, undefined, true, undefined, this),
                  /* @__PURE__ */ u3("div", {
                    class: "topbar-actions",
                    children: [
                      !example && /* @__PURE__ */ u3(FolderSwitch, {
                        folders: folderState
                      }, undefined, false, undefined, this),
                      data.forge && /* @__PURE__ */ u3("a", {
                        href: data.forge,
                        target: "_blank",
                        rel: "noopener noreferrer",
                        class: "forge-link",
                        children: [
                          "Open repository",
                          /* @__PURE__ */ u3(Icon, {
                            name: "external-link",
                            size: 13
                          }, undefined, false, undefined, this)
                        ]
                      }, undefined, true, undefined, this),
                      /* @__PURE__ */ u3("button", {
                        class: "icon-button",
                        "aria-label": "Refresh work log",
                        disabled: busy || example,
                        onClick: load,
                        children: /* @__PURE__ */ u3(Icon, {
                          name: "refresh"
                        }, undefined, false, undefined, this)
                      }, undefined, false, undefined, this)
                    ]
                  }, undefined, true, undefined, this)
                ]
              }, undefined, true, undefined, this),
              example && /* @__PURE__ */ u3("div", {
                class: "example-banner",
                children: [
                  /* @__PURE__ */ u3("span", {
                    children: [
                      /* @__PURE__ */ u3("strong", {
                        children: "Example data."
                      }, undefined, false, undefined, this),
                      /* @__PURE__ */ u3("span", {
                        class: "banner-description",
                        children: " Your repository isn't touched."
                      }, undefined, false, undefined, this)
                    ]
                  }, undefined, true, undefined, this),
                  /* @__PURE__ */ u3("button", {
                    onClick: () => switchExample(false),
                    children: [
                      "Back to my repository",
                      /* @__PURE__ */ u3(Icon, {
                        name: "arrow-right",
                        size: 14
                      }, undefined, false, undefined, this)
                    ]
                  }, undefined, true, undefined, this)
                ]
              }, undefined, true, undefined, this),
              !example && error && /* @__PURE__ */ u3("div", {
                class: "error-banner",
                role: "alert",
                children: [
                  /* @__PURE__ */ u3("span", {
                    children: loaded ? "Connection lost. Showing the last recorded work." : "Can’t load this repository. Check that the ANVC server is still running."
                  }, undefined, false, undefined, this),
                  /* @__PURE__ */ u3("button", {
                    onClick: load,
                    disabled: busy,
                    children: busy ? "Retrying…" : "Try again"
                  }, undefined, false, undefined, this)
                ]
              }, undefined, true, undefined, this),
              /* @__PURE__ */ u3("div", {
                class: "page-heading",
                children: [
                  /* @__PURE__ */ u3("div", {
                    children: [
                      /* @__PURE__ */ u3("h1", {
                        children: page === "work" && session ? "Session" : TITLE2[page]
                      }, undefined, false, undefined, this),
                      page === "work" && sessionTitle && /* @__PURE__ */ u3("p", {
                        children: sessionTitle
                      }, undefined, false, undefined, this)
                    ]
                  }, undefined, true, undefined, this),
                  !example && (error || !loaded) && /* @__PURE__ */ u3("span", {
                    class: `sync-status${error && !example ? " offline" : ""}`,
                    role: "status",
                    children: [
                      /* @__PURE__ */ u3("span", {
                        class: "connection-dot"
                      }, undefined, false, undefined, this),
                      error ? "Disconnected" : "Connecting…"
                    ]
                  }, undefined, true, undefined, this)
                ]
              }, undefined, true, undefined, this),
              page === "work" && !example && !(loaded && !data.turns.length) && /* @__PURE__ */ u3(OffBanner, {
                folders: folderState
              }, undefined, false, undefined, this),
              page === "work" && !example && !session && loaded && /* @__PURE__ */ u3(HelpedBlock, {}, undefined, false, undefined, this),
              page === "folders" && /* @__PURE__ */ u3(FoldersPage, {
                folders: folderState
              }, undefined, false, undefined, this),
              page === "results" && /* @__PURE__ */ u3(ResultsHub, {}, undefined, false, undefined, this),
              page === "stats" && /* @__PURE__ */ u3(StatsPage, {}, undefined, false, undefined, this),
              page === "project" && /* @__PURE__ */ u3(ProjectPage, {}, undefined, false, undefined, this),
              page === "settings" && /* @__PURE__ */ u3(Settings, {}, undefined, false, undefined, this),
              page === "faq" && /* @__PURE__ */ u3(FaqPage, {}, undefined, false, undefined, this),
              page === "work" && (loaded || example) && data.turns.length > 0 && /* @__PURE__ */ u3(S, {
                children: [
                  /* @__PURE__ */ u3("div", {
                    class: "filterbar",
                    children: [
                      /* @__PURE__ */ u3("div", {
                        class: "filter-tabs",
                        role: "group",
                        "aria-label": "Filter by outcome",
                        children: FILTERS2.filter((filter) => filter.value !== "unexplained" || outcome === "unexplained" || count("unexplained") > 0).map((filter) => /* @__PURE__ */ u3("button", {
                          "aria-pressed": outcome === filter.value,
                          onClick: () => {
                            setOutcome(filter.value);
                            setSelected(null);
                          },
                          class: `${outcome === filter.value ? "current" : ""}${filter.value === "unexplained" ? " tab-missing" : ""}`,
                          children: [
                            filter.label,
                            /* @__PURE__ */ u3("span", {
                              children: count(filter.value)
                            }, undefined, false, undefined, this)
                          ]
                        }, filter.value, true, undefined, this))
                      }, undefined, false, undefined, this),
                      /* @__PURE__ */ u3("label", {
                        class: "search",
                        children: [
                          /* @__PURE__ */ u3(Icon, {
                            name: "search"
                          }, undefined, false, undefined, this),
                          /* @__PURE__ */ u3("input", {
                            ref: search,
                            "aria-label": "Search work",
                            type: "search",
                            placeholder: "Search work…",
                            value: query,
                            onInput: (event) => setQuery(event.currentTarget.value)
                          }, undefined, false, undefined, this),
                          /* @__PURE__ */ u3("kbd", {
                            children: query ? "esc" : "/"
                          }, undefined, false, undefined, this)
                        ]
                      }, undefined, true, undefined, this)
                    ]
                  }, undefined, true, undefined, this),
                  /* @__PURE__ */ u3("div", {
                    class: `list-heading${query || session || outcome !== "all" ? " has-filters" : ""}`,
                    children: /* @__PURE__ */ u3("span", {
                      children: [
                        session && /* @__PURE__ */ u3("button", {
                          class: "session-filter",
                          onClick: () => {
                            setSession(null);
                            setSelected(null);
                          },
                          "aria-label": "Clear session filter",
                          children: [
                            "Session",
                            /* @__PURE__ */ u3(Icon, {
                              name: "close",
                              size: 12
                            }, undefined, false, undefined, this)
                          ]
                        }, undefined, true, undefined, this),
                        (query || session || outcome !== "all") && /* @__PURE__ */ u3("span", {
                          "aria-live": "polite",
                          children: [
                            shown.length,
                            " of ",
                            data.turns.length,
                            query ? ` matching “${query}”` : ""
                          ]
                        }, undefined, true, undefined, this)
                      ]
                    }, undefined, true, undefined, this)
                  }, undefined, false, undefined, this),
                  /* @__PURE__ */ u3("div", {
                    class: `work-layout${active ? " has-detail" : ""}`,
                    children: [
                      /* @__PURE__ */ u3("div", {
                        class: "work-list",
                        children: [
                          shown.length ? [...shown].sort((a, b) => b.start.localeCompare(a.start)).map((turn, i, sorted) => /* @__PURE__ */ u3(S, {
                            children: [
                              (i === 0 || new Date(sorted[i - 1].start).toDateString() !== new Date(turn.start).toDateString()) && /* @__PURE__ */ u3("h3", {
                                class: "work-day",
                                children: DAY.format(new Date(turn.start))
                              }, undefined, false, undefined, this),
                              /* @__PURE__ */ u3(TurnRow, {
                                turn,
                                selected: active?.id === turn.id,
                                onSelect: () => setSelected(turn.id)
                              }, undefined, false, undefined, this)
                            ]
                          }, turn.id, true, undefined, this)) : /* @__PURE__ */ u3("div", {
                            class: "no-results",
                            children: [
                              /* @__PURE__ */ u3(Icon, {
                                name: "search",
                                size: 28
                              }, undefined, false, undefined, this),
                              /* @__PURE__ */ u3("h2", {
                                children: "No matches"
                              }, undefined, false, undefined, this),
                              /* @__PURE__ */ u3("p", {
                                children: "Try a file name or a word from the goal."
                              }, undefined, false, undefined, this),
                              /* @__PURE__ */ u3("button", {
                                class: "button",
                                onClick: reset,
                                children: "Clear filters"
                              }, undefined, false, undefined, this)
                            ]
                          }, undefined, true, undefined, this),
                          data.stats.records > data.turns.length && /* @__PURE__ */ u3("button", {
                            type: "button",
                            class: "button show-all",
                            onClick: () => setEverything(true),
                            children: [
                              "Show all ",
                              data.stats.records,
                              " attempts"
                            ]
                          }, undefined, true, undefined, this)
                        ]
                      }, undefined, true, undefined, this),
                      active && /* @__PURE__ */ u3(AttemptDetail, {
                        turn: active,
                        turns: data.turns,
                        forge: data.forge,
                        onSelect: (id) => {
                          reset();
                          setSelected(id);
                        },
                        onSession: (run) => {
                          reset();
                          setSession(run);
                        },
                        onClose: closeDetails
                      }, active.id, false, undefined, this)
                    ]
                  }, undefined, true, undefined, this)
                ]
              }, undefined, true, undefined, this),
              page === "work" && !example && !loaded && !error && /* @__PURE__ */ u3("div", {
                class: "loading-state",
                role: "status",
                children: [
                  /* @__PURE__ */ u3("div", {
                    class: "loading-line"
                  }, undefined, false, undefined, this),
                  /* @__PURE__ */ u3("div", {
                    class: "loading-line"
                  }, undefined, false, undefined, this),
                  /* @__PURE__ */ u3("div", {
                    class: "loading-line"
                  }, undefined, false, undefined, this),
                  /* @__PURE__ */ u3("span", {
                    children: "Loading…"
                  }, undefined, false, undefined, this)
                ]
              }, undefined, true, undefined, this),
              page === "work" && !example && loaded && !data.turns.length && /* @__PURE__ */ u3(Welcome, {
                on: folderState.here?.on ?? null,
                again: setup,
                onTurnOn: () => folderState.here && void folderState.set(folderState.here.repo, true),
                onSetup: () => setSetup(true),
                onExample: () => switchExample(true),
                onImported: load
              }, undefined, false, undefined, this)
            ]
          }, undefined, true, undefined, this)
        ]
      }, undefined, true, undefined, this),
      /* @__PURE__ */ u3(Setup, {
        open: setup,
        onClose: () => setSetup(false)
      }, undefined, false, undefined, this),
      /* @__PURE__ */ u3(Tour, {
        open: tour,
        onClose: () => setTour(false),
        onChoose: () => {
          setTour(false);
          setChoose(true);
        }
      }, undefined, false, undefined, this),
      /* @__PURE__ */ u3(Choose, {
        open: choose,
        onClose: () => {
          send("/api/seen", { key: "choose" });
          setChoose(false);
        },
        onCustomise: () => {
          setChoose(false);
          setPage("settings");
        }
      }, undefined, false, undefined, this)
    ]
  }, undefined, true, undefined, this);
}
R(/* @__PURE__ */ u3(App, {}, undefined, false, undefined, this), document.getElementById("root"));
