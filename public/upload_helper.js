// upload_helper.js
// Firebase Storage upload utility for Tap+
// Place in public/ — load before settings.js and staff-tabs.js

(function() {
  const BUCKET = 'tapplus-a2d09.appspot.com';
  const BASE   = 'https://firebasestorage.googleapis.com/v0/b/' + BUCKET + '/o';

  async function getAuthToken() {
    try {
      if (window._fbAuth && window._fbAuth.currentUser) {
        return await window._fbAuth.currentUser.getIdToken();
      }
    } catch(e) {}
    return null;
  }

  async function uploadToStorage(dataUrl, path) {
    const token = await getAuthToken();

    // Convert base64 data URL → Blob
    const parts       = dataUrl.split(',');
    const contentType = (parts[0].match(/:(.*?);/) || [])[1] || 'image/jpeg';
    const binary      = atob(parts[1]);
    const arr         = new Uint8Array(binary.length);
    for (var i = 0; i < binary.length; i++) arr[i] = binary.charCodeAt(i);
    const blob = new Blob([arr], { type: contentType });

    const encodedPath = encodeURIComponent(path);
    const uploadUrl   = BASE + '/' + encodedPath + '?uploadType=media&name=' + encodedPath;
    const headers     = { 'Content-Type': contentType };
    if (token) headers['Authorization'] = 'Firebase ' + token;

    const res = await fetch(uploadUrl, { method: 'POST', headers: headers, body: blob });
    if (!res.ok) {
      const errData = await res.json().catch(function() { return {}; });
      throw new Error((errData.error && errData.error.message) || 'Storage upload failed (' + res.status + ')');
    }

    const data = await res.json();
    return BASE + '/' + encodeURIComponent(data.name) + '?alt=media&token=' + data.downloadTokens;
  }

  window._uploadToStorage = uploadToStorage;

  window._uploadLogo = function(dataUrl, bizId) {
    var ext  = dataUrl.indexOf('data:image/png') === 0 ? 'png' : 'jpg';
    var path = 'logos/' + bizId + '_' + Date.now() + '.' + ext;
    return uploadToStorage(dataUrl, path);
  };

  window._uploadStaffPhoto = function(dataUrl, bizId, staffId) {
    var ext  = dataUrl.indexOf('data:image/png') === 0 ? 'png' : 'jpg';
    var path = 'staff/' + bizId + '_' + staffId + '_' + Date.now() + '.' + ext;
    return uploadToStorage(dataUrl, path);
  };

  window._uploadBulletinImage = function(dataUrl, bizId) {
    var ext  = dataUrl.indexOf('data:image/png') === 0 ? 'png' : 'jpg';
    var path = 'bulletin/' + bizId + '_' + Date.now() + '.' + ext;
    return uploadToStorage(dataUrl, path);
  };

})();