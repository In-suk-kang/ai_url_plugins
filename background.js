// background.js

// clear storage data upon opening browser
chrome.storage.local.clear().then(
  ()=>{//cleared
});
// 데이터 캐싱 및 저장 (올바른 key와 value 사용)
chrome.storage.local.set({ myKey: 'myValue' }, function() {
  console.log('데이터가 저장되었습니다.');
});

// 저장된 데이터 읽기 (올바른 key 사용)
chrome.storage.local.get('myKey', function(result) {
  console.log('저장된 데이터:', result.myKey);
});


// 이벤트 리스너 추가: content scripts에서 메시지를 기다림
chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
  if (request.action === 'checkURL') {
    const urlToCheck = request.url;
    const rooturl = request.rootURL;
    chrome.storage.local.get(rooturl)
      .then((result) => {
        if(Object.keys(result).length != 0){
          console.log("have data")
          chrome.notifications.create("phishingbox_noti", {type: "basic",title: urlToCheck, message: result.rooturl, iconUrl:"phishing_box.png"})
          .then(setTimeout(()=> chrome.notifications.clear("phishingbox_noti"), 1500))
          sendResponse({results: result});
      }else{
        if (urlToCheck.length > 63) {
          requestBody = JSON.stringify({ url: rooturl });
        } else {
          requestBody = JSON.stringify({ url: urlToCheck });
        }
        console.log("new data")
        // Django 웹 애플리케이션에 데이터 전송
        fetch('https://phishbox.site/api/endpoint', {
          method: 'POST',
          body: requestBody,
          headers: {
            'Content-Type': 'application/json',
            Accept: 'application / json',
          }
        })
          .then((response) => response.json())
          .then((result) => {
            console.log(result.predict_result);
            console.log(result)
            // 결과를 캐시에 저장
            chrome.storage.local.set({rooturl: result.predict_result});
            sendResponse({results: result.predict_result});
          })
          .catch((error) => {
            console.log('데이터를 가져오는 중 오류 발생:', error);
            sendResponse({results: "SERVER ERROR"});
            });
      };
    })
      .catch((error) => {sendResponse({results: error.message});});
    // 응답을 보냄
    setTimeout(() => sendResponse({ results: "SERVER ERROR" }), 500);
  };
  return true;
});
//URL 차단 또는 해제 함수
function toggleUrlBlocking(url) {
  // URL에 대한 JavaScript 설정 상태 가져오기
  chrome.contentSettings.javascript.get({ primaryUrl: url }, function(details) {
    const isBlocked = details.setting === 'block';
    const toggleSetting = isBlocked ? 'allow' : 'block';
    const setting = {
      primaryPattern: url,
      setting: toggleSetting, 
      scope: 'regular'
    };

    chrome.contentSettings.javascript.set(setting, function() {
      if (chrome.runtime.lastError) {
        console.error(`Error ${toggleSetting === 'block' ? 'blocking' : 'unblocking'}`);
      } else {
        console.log(`${toggleSetting === 'block' ? 'Blocked' : 'Unblocked'}`);
      }
    });
  });
}


// 메시지 리스너
chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
  if (request.action === 'blockAllItems') {
    const rootURL = request.rootURL;
    const urlToToggle = "https://" + rootURL + "/*";
    // URL 차단 또는 해제 함수 호출
    toggleUrlBlocking(urlToToggle);
  }
  return true;
});