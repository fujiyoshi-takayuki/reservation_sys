// js/test.js

// ★★★ ここをあなたのデプロイURLに置き換えてください ★★★
const GAS_URL = 'https://script.google.com/a/macros/stu.hosei.ac.jp/s/AKfycbxi05bMt4cD6xxfTH26eKxDs9rnFIi8Kj8fpTyYLkm-QE2eWhInxmDIoMQiqyZ2ofw/exec';

// テスト用のパラメータを定義
const TEST_PARAMS = {
    equipmentId: 'CAM001', // EquipmentMasterシートに存在するID
    start: '2025-12-01',   // テスト開始日
    end: '2025-12-10'      // テスト終了日
};

/**
 * GASの在庫確認APIを呼び出す関数
 */
function runAvailabilityTest() {
    const outputElement = document.getElementById('result');
    outputElement.textContent = 'GASへリクエスト送信中...';

    const url = `${GAS_URL}?action=getAvailability&equipmentId=${TEST_PARAMS.equipmentId}&start=${TEST_PARAMS.start}&end=${TEST_PARAMS.end}`;

    console.log('--- リクエストURL ---');
    console.log(url);
    
    fetch(url)
        .then(response => {
            if (!response.ok) {
                // HTTPエラー（例: 404, 500）の処理
                throw new Error(`HTTP Error! Status: ${response.status}`);
            }
            return response.json();
        })
        .then(data => {
            console.log('--- GASからのレスポンスデータ ---');
            console.log(data);
            
            if (data.status === 'success') {
                outputElement.textContent = '✅ テスト成功！在庫データを受信しました。\n\n' + JSON.stringify(data, null, 2);
                console.log('✅ テスト成功！在庫データ:', data.availability);
                
                // 例: 12月5日の空き台数を表示
                console.log(`12月5日の空き台数: ${data.availability['2025-12-05']}`);
            } else {
                // GAS側で定義したエラー (例: IDが見つからない)
                outputElement.textContent = `❌ GASエラー: ${data.message}\n\n` + JSON.stringify(data, null, 2);
                console.error('❌ GASからエラーが返されました:', data.message);
            }
        })
        .catch(error => {
            console.error('致命的な通信エラー:', error);
            outputElement.textContent = `❌ 通信エラー: GASエンドポイントへのアクセスに失敗しました。\n詳細をコンソールで確認してください。`;
        });
}