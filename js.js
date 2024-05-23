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
var ua = navigator.userAgent;//iOS������
if (ua.indexOf( 'iPhone') > 0 || ua.indexOf('iPad') > 0 ) var isApple = 1;
else var isApple = 0;
document.getElementById('isApple').value = isApple;
var message="Apple�̋@��ł́A�d�l�ɂ��p�X���[�h�ƃ����������ȓ��ɏ�������܂��B"
document.getElementById('ios1').innerHTML=message;

function ready(){
	if (indexedDB) {
//		window.alert("���̃u���E�U�ł�Indexed DataBase API ���g���܂��B");
		// �f�[�^�x�[�X���폜�������ꍇ�̓R�����g���O���܂��B
//		indexedDB.deleteDatabase("areaDb");
		var openRequest = indexedDB.open("areaDb", 1.0);
		openRequest.onupgradeneeded = function(event) {
			// �f�[�^�x�[�X�̃o�[�W�����ɕύX���������ꍇ(���߂Ă̏ꍇ��������ʂ�܂��B)
			db = event.target.result;
			var store = db.createObjectStore("areaStore", { keyPath: "type"});
//			store.createIndex("myvalueIndex", "myvalue");
		}
		openRequest.onsuccess = function(event) {
			db = event.target.result;
			getAll();
		}
	} else {
		window.alert("���̃u���E�U�ł�Indexed DataBase API �͎g���܂���B");
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
			if (cv.data.date > Date.parse(date)-1000*60*60*24*10 ){//�ێ�����10��
				document.getElementById('pw').value=cv.data.memo;
			}else alert("�p�X���[�h�̍ē��͂��K�v�ł��B\nOK�{�^�����^�b�v���Ă��������B");//10�����O�C�����Ȃ��ƍ폜�B
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
