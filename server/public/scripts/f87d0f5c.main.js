"use strict";!function(a,b){var c={$el:b("#fkURLForm"),$inputEl:b("#productPageURL"),oldURL:null,handleURLInput:function(){var a=Array.prototype.slice.call(arguments,0);if(1===a.length){var e=a[0],f=b.trim(b(e.target).val());f.indexOf("flipkart.com")>0&&f!==c.oldURL&&(c.oldURL=f,b.getJSON("/inputurl",{url:f},function(a){if(a.price){var c=a.price,e=a.name,f=a.image;if("content"in document.createElement("template")){var g=document.querySelector("#tmplNotifyMe"),h=g.content.querySelector("#product-title"),i=g.content.querySelector("#product-price"),j=g.content.querySelector("#product-image");h.textContent=e,i.textContent=c,j.src=f,j.alt=e;var k=document.importNode(g.content,!0),l=document.querySelector("#response-container");l.appendChild(k),b(d.el).on("submit",d.handleFormSubmit)}}}))}}},d={el:"#fkSubmissionForm",handleFormSubmit:function(a){a.preventDefault(),b.getJSON("/queue",b(this).serialize(),function(a){console.log(a),a.isEmailVerified})}};c.$inputEl.on("keyup",c.handleURLInput)}(window,jQuery);