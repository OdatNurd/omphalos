"use strict";(self.webpackChunkwebsite=self.webpackChunkwebsite||[]).push([[398],{3905:(e,n,t)=>{t.d(n,{Zo:()=>u,kt:()=>h});var a=t(7294);function o(e,n,t){return n in e?Object.defineProperty(e,n,{value:t,enumerable:!0,configurable:!0,writable:!0}):e[n]=t,e}function r(e,n){var t=Object.keys(e);if(Object.getOwnPropertySymbols){var a=Object.getOwnPropertySymbols(e);n&&(a=a.filter((function(n){return Object.getOwnPropertyDescriptor(e,n).enumerable}))),t.push.apply(t,a)}return t}function l(e){for(var n=1;n<arguments.length;n++){var t=null!=arguments[n]?arguments[n]:{};n%2?r(Object(t),!0).forEach((function(n){o(e,n,t[n])})):Object.getOwnPropertyDescriptors?Object.defineProperties(e,Object.getOwnPropertyDescriptors(t)):r(Object(t)).forEach((function(n){Object.defineProperty(e,n,Object.getOwnPropertyDescriptor(t,n))}))}return e}function i(e,n){if(null==e)return{};var t,a,o=function(e,n){if(null==e)return{};var t,a,o={},r=Object.keys(e);for(a=0;a<r.length;a++)t=r[a],n.indexOf(t)>=0||(o[t]=e[t]);return o}(e,n);if(Object.getOwnPropertySymbols){var r=Object.getOwnPropertySymbols(e);for(a=0;a<r.length;a++)t=r[a],n.indexOf(t)>=0||Object.prototype.propertyIsEnumerable.call(e,t)&&(o[t]=e[t])}return o}var s=a.createContext({}),d=function(e){var n=a.useContext(s),t=n;return e&&(t="function"==typeof e?e(n):l(l({},n),e)),t},u=function(e){var n=d(e.components);return a.createElement(s.Provider,{value:n},e.children)},p="mdxType",c={inlineCode:"code",wrapper:function(e){var n=e.children;return a.createElement(a.Fragment,{},n)}},m=a.forwardRef((function(e,n){var t=e.components,o=e.mdxType,r=e.originalType,s=e.parentName,u=i(e,["components","mdxType","originalType","parentName"]),p=d(t),m=o,h=p["".concat(s,".").concat(m)]||p[m]||c[m]||r;return t?a.createElement(h,l(l({ref:n},u),{},{components:t})):a.createElement(h,l({ref:n},u))}));function h(e,n){var t=arguments,o=n&&n.mdxType;if("string"==typeof e||o){var r=t.length,l=new Array(r);l[0]=m;var i={};for(var s in n)hasOwnProperty.call(n,s)&&(i[s]=n[s]);i.originalType=e,i[p]="string"==typeof e?e:o,l[1]=i;for(var d=2;d<r;d++)l[d]=t[d];return a.createElement.apply(null,l)}return a.createElement.apply(null,t)}m.displayName="MDXCreateElement"},3014:(e,n,t)=>{t.r(n),t.d(n,{assets:()=>v,contentTitle:()=>y,default:()=>O,frontMatter:()=>f,metadata:()=>k,toc:()=>w});var a=t(7462),o=t(7294),r=t(3905),l=t(6010),i=t(2389),s=t(7392),d=t(7094),u=t(2466);const p="tabList__CuJ",c="tabItem_LNqP";function m(e){const{lazy:n,block:t,defaultValue:r,values:i,groupId:m,className:h}=e,g=o.Children.map(e.children,(e=>{if((0,o.isValidElement)(e)&&"value"in e.props)return e;throw new Error(`Docusaurus error: Bad <Tabs> child <${"string"==typeof e.type?e.type:e.type.name}>: all children of the <Tabs> component should be <TabItem>, and every <TabItem> should have a unique "value" prop.`)})),b=i??g.map((e=>{let{props:{value:n,label:t,attributes:a}}=e;return{value:n,label:t,attributes:a}})),f=(0,s.l)(b,((e,n)=>e.value===n.value));if(f.length>0)throw new Error(`Docusaurus error: Duplicate values "${f.map((e=>e.value)).join(", ")}" found in <Tabs>. Every value needs to be unique.`);const y=null===r?r:r??g.find((e=>e.props.default))?.props.value??g[0].props.value;if(null!==y&&!b.some((e=>e.value===y)))throw new Error(`Docusaurus error: The <Tabs> has a defaultValue "${y}" but none of its children has the corresponding value. Available values are: ${b.map((e=>e.value)).join(", ")}. If you intend to show no default tab, use defaultValue={null} instead.`);const{tabGroupChoices:k,setTabGroupChoices:v}=(0,d.U)(),[w,N]=(0,o.useState)(y),O=[],{blockElementScrollPositionUntilNextRender:T}=(0,u.o5)();if(null!=m){const e=k[m];null!=e&&e!==w&&b.some((n=>n.value===e))&&N(e)}const C=e=>{const n=e.currentTarget,t=O.indexOf(n),a=b[t].value;a!==w&&(T(n),N(a),null!=m&&v(m,String(a)))},x=e=>{let n=null;switch(e.key){case"Enter":C(e);break;case"ArrowRight":{const t=O.indexOf(e.currentTarget)+1;n=O[t]??O[0];break}case"ArrowLeft":{const t=O.indexOf(e.currentTarget)-1;n=O[t]??O[O.length-1];break}}n?.focus()};return o.createElement("div",{className:(0,l.Z)("tabs-container",p)},o.createElement("ul",{role:"tablist","aria-orientation":"horizontal",className:(0,l.Z)("tabs",{"tabs--block":t},h)},b.map((e=>{let{value:n,label:t,attributes:r}=e;return o.createElement("li",(0,a.Z)({role:"tab",tabIndex:w===n?0:-1,"aria-selected":w===n,key:n,ref:e=>O.push(e),onKeyDown:x,onClick:C},r,{className:(0,l.Z)("tabs__item",c,r?.className,{"tabs__item--active":w===n})}),t??n)}))),n?(0,o.cloneElement)(g.filter((e=>e.props.value===w))[0],{className:"margin-top--md"}):o.createElement("div",{className:"margin-top--md"},g.map(((e,n)=>(0,o.cloneElement)(e,{key:n,hidden:e.props.value!==w})))))}function h(e){const n=(0,i.Z)();return o.createElement(m,(0,a.Z)({key:String(n)},e))}const g="tabItem_Ymn6";function b(e){let{children:n,hidden:t,className:a}=e;return o.createElement("div",{role:"tabpanel",className:(0,l.Z)(g,a),hidden:t},n)}const f={title:"Creating Bundles",toc_max_heading_level:4},y=void 0,k={unversionedId:"quickstart/bundles",id:"quickstart/bundles",title:"Creating Bundles",description:"Omphalos itself is just a container that allows you free form access to",source:"@site/docs/quickstart/03-bundles.md",sourceDirName:"quickstart",slug:"/quickstart/bundles",permalink:"/docs/quickstart/bundles",draft:!1,tags:[],version:"current",sidebarPosition:3,frontMatter:{title:"Creating Bundles",toc_max_heading_level:4},sidebar:"tutorialSidebar",previous:{title:"Configuring Omphalos",permalink:"/docs/quickstart/configuration"},next:{title:"Guides",permalink:"/docs/category/guides"}},v={},w=[{value:"Creating your first bundle",id:"creating-your-first-bundle",level:2},{value:"Creating the base bundle",id:"creating-the-base-bundle",level:3},{value:"Adding Omphalos Metadata",id:"adding-omphalos-metadata",level:3},{value:"Adding content",id:"adding-content",level:2},{value:"Adding a Panel",id:"adding-a-panel",level:3},{value:"Adding a Graphic",id:"adding-a-graphic",level:3},{value:"Adding an Extension",id:"adding-an-extension",level:3},{value:"Tying content together",id:"tying-content-together",level:2}],N={toc:w};function O(e){let{components:n,...t}=e;return(0,r.kt)("wrapper",(0,a.Z)({},N,t,{components:n,mdxType:"MDXLayout"}),(0,r.kt)("p",null,"Omphalos itself is just a ",(0,r.kt)("strong",{parentName:"p"},(0,r.kt)("em",{parentName:"strong"},"container"))," that allows you free form access to\ncreate your own graphical overlays, control panel pages and server side code,\nallowing them all to connect together."),(0,r.kt)("p",null,"To actually make use of the software, you need to install or create one or more\n",(0,r.kt)("inlineCode",{parentName:"p"},"bundles"),", which add functionality to the app and therefore your stream."),(0,r.kt)("p",null,"This page has a quick overview of the process of creating a bundle and what is\npossible. For more details instructions, refer to the guide section of the\ndocumentation, which goes into more detail."),(0,r.kt)("h2",{id:"creating-your-first-bundle"},"Creating your first bundle"),(0,r.kt)("p",null,"A bundle in Omphalos is just a standard NodeJS package, with some key\ninformation stored in the package manifest that describes the bundle and the\ncontent that it provides to the application."),(0,r.kt)("p",null,"Bundles must be stored either in the bundle area of the configuration folder or\nat your option, you can configure Omphalos to look in a specific location for\nyour bundle."),(0,r.kt)("h3",{id:"creating-the-base-bundle"},"Creating the base bundle"),(0,r.kt)("p",null,"In this example we will create a very simple bundle from scratch that shows some\nof the key concepts that are used when creating one."),(0,r.kt)("p",null,"To do this, we must create a simple NodeJS package in the bundle folder; the\nlocation of this folder is ",(0,r.kt)("a",{parentName:"p",href:"/docs/quickstart/configuration#configuration-area"},"based on your operating system"),"."),(0,r.kt)("p",null,"In your terminal, switch to the bundle folder for your OS, and use your package\nmanager to choice to initialize a new bundle:"),(0,r.kt)(h,{groupId:"npm2yarn",mdxType:"Tabs"},(0,r.kt)(b,{value:"npm",mdxType:"TabItem"},(0,r.kt)("pre",null,(0,r.kt)("code",{parentName:"pre",className:"language-bash"},"mkdir my-bundle-name\ncd my-bundle-name\nnpm init\n"))),(0,r.kt)(b,{value:"yarn",label:"Yarn",mdxType:"TabItem"},(0,r.kt)("pre",null,(0,r.kt)("code",{parentName:"pre",className:"language-bash"},"mkdir my-bundle-name\ncd my-bundle-name\nyarn init\n")))),(0,r.kt)("p",null,"The only keys that Omphalos requires in your initial ",(0,r.kt)("inlineCode",{parentName:"p"},"package.json")," are the\n",(0,r.kt)("inlineCode",{parentName:"p"},"name")," and ",(0,r.kt)("inlineCode",{parentName:"p"},"version")," keys. Any other keys you would normally find in the\nmanifest are fine, but Omphalos will ignore them."),(0,r.kt)("pre",null,(0,r.kt)("code",{parentName:"pre",className:"language-json",metastring:"title='my-bundle-name/package.json'",title:"'my-bundle-name/package.json'"},'{\n  "name": "my-bundle-name",\n  "version": "1.0.0",\n}\n')),(0,r.kt)("h3",{id:"adding-omphalos-metadata"},"Adding Omphalos Metadata"),(0,r.kt)("p",null,"In order to be recognized as a bundle, your package must:"),(0,r.kt)("ol",null,(0,r.kt)("li",{parentName:"ol"},"Be stored in the ",(0,r.kt)("inlineCode",{parentName:"li"},"bundles")," folder of the configuration area OR have its\nlocation listed as an additional bundle"),(0,r.kt)("li",{parentName:"ol"},"Have a valid ",(0,r.kt)("inlineCode",{parentName:"li"},"name")," and ",(0,r.kt)("inlineCode",{parentName:"li"},"version")," key"),(0,r.kt)("li",{parentName:"ol"},"Contain an ",(0,r.kt)("inlineCode",{parentName:"li"},"omphalos")," key with the required metadata.")),(0,r.kt)("p",null,"See the documentation on ",(0,r.kt)("a",{parentName:"p",href:"/docs/guides/manifest"},"bundle manifests")," for complete details on the\navailable options. The only required key is the one that tells Omphalos what\nversion of the application is required for the bundle to operate:"),(0,r.kt)("pre",null,(0,r.kt)("code",{parentName:"pre",className:"language-json",metastring:"title='my-bundle-name/package.json'",title:"'my-bundle-name/package.json'"},'{\n  "name": "my-bundle-name",\n  "version": "1.0.0",\n  "omphalos": {\n    "compatibleRange": "~0.0.1"\n  }\n}\n')),(0,r.kt)("p",null,"At this point, if you quit and restart Omphalos, the logs should show you that\nyour bundle was found and loaded without errors:"),(0,r.kt)("pre",null,(0,r.kt)("code",{parentName:"pre",className:"language-bash",metastring:"title='Sample Application Startup'",title:"'Sample",Application:!0,"Startup'":!0},"2022-12-23 11:54:53.746 [info] core: --------------------------------\n2022-12-23 11:54:53.751 [info] core: omphalos version 0.0.1 launching\n2022-12-23 11:54:53.751 [info] core: --------------------------------\n2022-12-23 11:54:53.753 [info] core: no extra CORS origin added\n2022-12-23 11:54:53.755 [info] resolver: scanning all bundle folders for installed bundles\n2022-12-23 11:54:53.756 [info] resolver: found 1 potential bundle(s)\n2022-12-23 11:54:53.757 [info] resolver: loaded bundle manifest for 'my-sample-bundle' from bundles/my-sample-bundle\n2022-12-23 11:54:53.760 [info] loader: loading bundle my-sample-bundle\n2022-12-23 11:54:53.760 [info] loader: loading code extensions for 'my-sample-bundle'\n2022-12-23 11:54:53.760 [warn] loader: bundle 'my-sample-bundle' has no extensions; skipping setup\n2022-12-23 11:54:53.760 [info] loader: setting up routes for 'my-sample-bundle' panels\n2022-12-23 11:54:53.761 [warn] loader: bundle 'my-sample-bundle' has no panels; skipping setup\n2022-12-23 11:54:53.761 [info] loader: setting up routes for 'my-sample-bundle' graphics\n2022-12-23 11:54:53.761 [warn] loader: bundle 'my-sample-bundle' has no graphics; skipping setup\n2022-12-23 11:54:53.772 [info] core: listening for requests at http://localhost:3000\n")),(0,r.kt)("p",null,"The bundle resolver scans for and finds the bundle, loads and validates the\nmanifest, verifies that the version of Omphalos is compatible, if so, proceeds\nwith loading of the bundle."),(0,r.kt)("h2",{id:"adding-content"},"Adding content"),(0,r.kt)("p",null,"As seen above, the bundle no content to speak of; no server side ",(0,r.kt)("inlineCode",{parentName:"p"},"extension"),"\ncode, no dashboard ",(0,r.kt)("inlineCode",{parentName:"p"},"panels")," and no overlay ",(0,r.kt)("inlineCode",{parentName:"p"},"graphics"),"."),(0,r.kt)("h3",{id:"adding-a-panel"},"Adding a Panel"),(0,r.kt)("p",null,"[ steps for adding a simple panel with a screenshot of it in the dashboard ]"),(0,r.kt)("h3",{id:"adding-a-graphic"},"Adding a Graphic"),(0,r.kt)("p",null,"[ steps for adding a graphic; show screenshot of it loaded in a browser ]"),(0,r.kt)("p",null,"This one is problematic because until we come up with the user interface to\nview graphics, you need to know urls."),(0,r.kt)("h3",{id:"adding-an-extension"},"Adding an Extension"),(0,r.kt)("p",null,"[ sample extension code ; show it starting up ]"),(0,r.kt)("h2",{id:"tying-content-together"},"Tying content together"),(0,r.kt)("p",null,"The steps here would walk through the simplistic changes needed to the above\nsamples so that the panel has a button in it which, when clicked, sends a\nmessage to the back end, which will send a message to the graphic."),(0,r.kt)("p",null,"The graphic should respond to both messages and display something to show that\nit gets both messages and not just one."),(0,r.kt)("p",null,"This shows the basics of how message sending allows you to tie everything\ntogether."))}O.isMDXComponent=!0}}]);