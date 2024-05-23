var scale = window.innerWidth / window.screen.width;
document.body.style.width=100/scale+"%";
document.body.style.height=100/scale+"%";
document.body.style.transform="scale("+scale+")";
window.onresize = function(){
  var scale = window.innerWidth / window.screen.width;
  document.body.style.width = 100/scale+"%";
  document.body.style.height = 100/scale+"%";
  document.body.style.transform = "scale("+scale+")";
};
var db;
var indexedDB = window.indexedDB || window.mozIndexedDB || window.msIndexedDB;
var dbName = 'areaDB';
var storeName = 'areaStore';
var myDatas=[];//myDatas=[{type:type,data:{date:date,memo:memo}},...]
var date = new Date();

ready();
//document.getElementById('login').onclick = setValue;
var ua = navigator.userAgent;//iOSか判別
if (ua.indexOf( 'iPhone') > 0 || ua.indexOf('iPad') > 0 ) var isApple = 1;
else var isApple = 0;
document.getElementById('isApple').value = isApple;
var message="Appleの機器では、仕様によりパスワードとメモが数日以内に消去されます。"
document.getElementById('ios1').innerHTML=message;

function ready(){
	if (indexedDB) {
//		window.alert("このブラウザではIndexed DataBase API が使えます。");
		// データベースを削除したい場合はコメントを外します。
//		indexedDB.deleteDatabase("areaDb");
		var openRequest = indexedDB.open("areaDb", 1.0);
		openRequest.onupgradeneeded = function(event) {
			// データベースのバージョンに変更があった場合(初めての場合もここを通ります。)
			db = event.target.result;
			var store = db.createObjectStore("areaStore", { keyPath: "type"});
//			store.createIndex("myvalueIndex", "myvalue");
		}
		openRequest.onsuccess = function(event) {
			db = event.target.result;
			getAll();
		}
	} else {
		window.alert("このブラウザではIndexed DataBase API は使えません。");
	}
}

function getAll() {
	var transaction = db.transaction(["areaStore"], "readwrite");
	var store = transaction.objectStore("areaStore");
	var request = store.openCursor();
	request.onsuccess = function (event) {
		if(event.target.result == null) {
			return;
		}
		var cursor = event.target.result;
	        var cv = cursor.value;
		myDatas.push(cv)//myDatas=[{type:type,data:{date:date,memo:memo}},...]
		if (cv.type=="pw") {
			if (cv.data.date > Date.parse(date)-1000*60*60*24*10 ){//保持期間10日
				document.getElementById('pw').value=cv.data.memo;
			}else alert("パスワードの再入力が必要です。\nOKボタンをタップしてください。");//10日ログインしないと削除。
		}
		cursor.continue();
	}
}

function setValue() {
	var d = String(Date.parse(date));
	var v = document.getElementById('pw').value;
	var transaction = db.transaction(["areaStore"], "readwrite");
	var store = transaction.objectStore("areaStore");
	var request = store.put({ type:"pw", data:{date:d, memo:v} });
	request.onsuccess = function (event) {
	}
}

function onSuccess() {
  google.script.host.close();
}
