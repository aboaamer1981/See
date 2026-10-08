/** V2.7.1 WebApp — دخول موحد ثم لوحة الإدارة/المدرسة */
function doGet(){var t=HtmlService.createTemplateFromFile('Index_V40');try{t.appUrl=ScriptApp.getService().getUrl()||'';}catch(e){t.appUrl='';}return t.evaluate().setTitle('بوابة صدفا الرقمية').setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL).addMetaTag('viewport','width=device-width, initial-scale=1, viewport-fit=cover');}
function include(name){return HtmlService.createHtmlOutputFromFile(name).getContent();}
