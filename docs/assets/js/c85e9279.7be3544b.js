"use strict";(self.webpackChunkwebsite=self.webpackChunkwebsite||[]).push([[312],{3905:(e,t,n)=>{n.d(t,{Zo:()=>c,kt:()=>m});var r=n(7294);function o(e,t,n){return t in e?Object.defineProperty(e,t,{value:n,enumerable:!0,configurable:!0,writable:!0}):e[t]=n,e}function i(e,t){var n=Object.keys(e);if(Object.getOwnPropertySymbols){var r=Object.getOwnPropertySymbols(e);t&&(r=r.filter((function(t){return Object.getOwnPropertyDescriptor(e,t).enumerable}))),n.push.apply(n,r)}return n}function a(e){for(var t=1;t<arguments.length;t++){var n=null!=arguments[t]?arguments[t]:{};t%2?i(Object(n),!0).forEach((function(t){o(e,t,n[t])})):Object.getOwnPropertyDescriptors?Object.defineProperties(e,Object.getOwnPropertyDescriptors(n)):i(Object(n)).forEach((function(t){Object.defineProperty(e,t,Object.getOwnPropertyDescriptor(n,t))}))}return e}function l(e,t){if(null==e)return{};var n,r,o=function(e,t){if(null==e)return{};var n,r,o={},i=Object.keys(e);for(r=0;r<i.length;r++)n=i[r],t.indexOf(n)>=0||(o[n]=e[n]);return o}(e,t);if(Object.getOwnPropertySymbols){var i=Object.getOwnPropertySymbols(e);for(r=0;r<i.length;r++)n=i[r],t.indexOf(n)>=0||Object.prototype.propertyIsEnumerable.call(e,n)&&(o[n]=e[n])}return o}var s=r.createContext({}),p=function(e){var t=r.useContext(s),n=t;return e&&(n="function"==typeof e?e(t):a(a({},t),e)),n},c=function(e){var t=p(e.components);return r.createElement(s.Provider,{value:t},e.children)},u="mdxType",f={inlineCode:"code",wrapper:function(e){var t=e.children;return r.createElement(r.Fragment,{},t)}},d=r.forwardRef((function(e,t){var n=e.components,o=e.mdxType,i=e.originalType,s=e.parentName,c=l(e,["components","mdxType","originalType","parentName"]),u=p(n),d=o,m=u["".concat(s,".").concat(d)]||u[d]||f[d]||i;return n?r.createElement(m,a(a({ref:t},c),{},{components:n})):r.createElement(m,a({ref:t},c))}));function m(e,t){var n=arguments,o=t&&t.mdxType;if("string"==typeof e||o){var i=n.length,a=new Array(i);a[0]=d;var l={};for(var s in t)hasOwnProperty.call(t,s)&&(l[s]=t[s]);l.originalType=e,l[u]="string"==typeof e?e:o,a[1]=l;for(var p=2;p<i;p++)a[p]=n[p];return r.createElement.apply(null,a)}return r.createElement.apply(null,n)}d.displayName="MDXCreateElement"},2901:(e,t,n)=>{n.r(t),n.d(t,{assets:()=>s,contentTitle:()=>a,default:()=>u,frontMatter:()=>i,metadata:()=>l,toc:()=>p});var r=n(7462),o=(n(7294),n(3905));const i={title:"listenFor"},a=void 0,l={unversionedId:"api/omphalos/listenfor",id:"api/omphalos/listenfor",title:"listenFor",description:"Listen for a given event to arrive and, when it does, invoke the listener with",source:"@site/docs/api/omphalos/08_listenfor.md",sourceDirName:"api/omphalos",slug:"/api/omphalos/listenfor",permalink:"/docs/api/omphalos/listenfor",draft:!1,tags:[],version:"current",sidebarPosition:8,frontMatter:{title:"listenFor"},sidebar:"tutorialSidebar",previous:{title:"sendMessageToBundle",permalink:"/docs/api/omphalos/sendmessagetobundle"}},s={},p=[],c={toc:p};function u(e){let{components:t,...n}=e;return(0,o.kt)("wrapper",(0,r.Z)({},c,n,{components:t,mdxType:"MDXLayout"}),(0,o.kt)("pre",null,(0,o.kt)("code",{parentName:"pre",className:"language-js"},"function listenFor(event, listener)\nfunction listenFor(event, bundle, listener)\n")),(0,o.kt)("p",null,"Listen for a given event to arrive and, when it does, invoke the listener with\nthe payload of the event as an argument."),(0,o.kt)("p",null,"By default the event is listened for in the current bundle; to listen for\nevents that were sent to some other bundle, pass that as the second argument to\nthe function."),(0,o.kt)("admonition",{title:"variable arguments",type:"note"},(0,o.kt)("p",{parentName:"admonition"},"With only two arguments, the ",(0,o.kt)("inlineCode",{parentName:"p"},"bundle")," is inferred to be the current bundle;\nthus you only need to include it in the argument list when you want to listen\nfor outside events.")))}u.isMDXComponent=!0}}]);