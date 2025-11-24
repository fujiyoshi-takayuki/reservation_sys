// js/main.js

// ★★★ ここをあなたのGAS Web Appの最新デプロイURLに置き換えてください ★★★
// const GAS_URL = 'https://script.google.com/a/macros/stu.hosei.ac.jp/s/AKfycbxi05bMt4cD6xxfTH26eKxDs9rnFIi8Kj8fpTyYLkm-QE2eWhInxmDIoMQiqyZ2ofw/exec';
const GAS_URL = 'https://script.google.com/a/macros/stu.hosei.ac.jp/s/AKfycbyMPy7WWPXfoFGqzMd-dofwEtzkTtNsq1bddCXTk9LtoZSZd5bcUbqsK5KVQkF9eQwN/exec';

// 予約する機材IDを定義 (今回はCAM001で固定)
const EQUIPMENT_ID = 'CAM001';

// 現在表示しているカレンダーの月を保持する変数
let currentDate = new Date();
// 選択された予約期間
let selectedStart = null;
let selectedEnd = null;
// GASから取得した在庫データ全体
let availabilityData = {};
// 総在庫数
let maxStock = 0;

// DOM要素の参照
const currentMonthYear = document.getElementById('current-month-year');
const calendarView = document.getElementById('calendar-view');
const maxStockElement = document.getElementById('max-stock');
const selectionStatus = document.getElementById('selection-status');
const startDateInput = document.getElementById('start-date');
const endDateInput = document.getElementById('end-date');
const submitButton = document.getElementById('submit-booking');

// 日付フォーマットヘルパー関数 (YYYY-MM-DD 形式)
function formatDateKey(date) {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
}

// js/main.js (続き)

/**
 * GASから在庫データを取得し、グローバル変数に格納する
 * @param {Date} date - 取得したい月のDateオブジェクト
 */
async function fetchAvailability(date) {
    // 取得期間を現在の月の最初の日から2か月後までとする
    const startDate = new Date(date.getFullYear(), date.getMonth(), 1);
    const endDate = new Date(date.getFullYear(), date.getMonth() + 2, 0); // 2か月後の最終日

    const startStr = formatDateKey(startDate);
    const endStr = formatDateKey(endDate);

    const url = `${GAS_URL}?action=getAvailability&equipmentId=${EQUIPMENT_ID}&start=${startStr}&end=${endStr}`;

    try {
        calendarView.innerHTML = '<div style="grid-column: 1 / 8; padding: 20px;">在庫情報を取得中...</div>';
        console.log('DBG: Fetching URL:', url); // ★追加ログ1
        const response = await fetch(url);
        console.log('DBG: Response Status:', response.status); // ★追加ログ2
        const text = await response.text(); // JSONとしてパースする前にテキストで受け取る
        console.log('DBG: Received Text:', text.substring(0, 200) + '...'); // ★追加ログ3: 受け取った生データを確認
        const data = JSON.parse(text);
        // const data = await response.json();

        if (data.status === 'success') {
            availabilityData = data.availability;
            maxStock = data.maxStock;
            maxStockElement.textContent = maxStock;
            
            // データ取得後、カレンダーを描画
            renderCalendar(date);
        } else {
            alert('在庫情報の取得に失敗しました: ' + data.message);
            calendarView.innerHTML = `<div style="grid-column: 1 / 8; padding: 20px; color: red;">${data.message}</div>`;
        }
    } catch (error) {
        console.error('GAS通信エラー:', error);
        alert('サーバーとの通信に失敗しました。');
        calendarView.innerHTML = `<div style="grid-column: 1 / 8; padding: 20px; color: red;">サーバーとの通信に失敗しました。</div>`;
    }
}

// js/main.js (続き)

/**
 * カレンダーUIを生成し、在庫状況を反映させる
 * @param {Date} date - 表示する月のDateオブジェクト
 */
function renderCalendar(date) {
    calendarView.innerHTML = '';
    
    const year = date.getFullYear();
    const month = date.getMonth(); // 0-11
    currentMonthYear.textContent = `${year}年${month + 1}月`;

    // 曜日ヘッダー
    const dayNames = ['日', '月', '火', '水', '木', '金', '土'];
    dayNames.forEach(day => {
        const header = document.createElement('div');
        header.classList.add('day-header');
        header.textContent = day;
        calendarView.appendChild(header);
    });

    // 月の最初の日と最終日
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startingDay = firstDay.getDay(); // 0 (日) - 6 (土)

    // 前月の日付の空セルを挿入
    for (let i = 0; i < startingDay; i++) {
        calendarView.appendChild(document.createElement('div'));
    }

    // 今月の日付セルを生成
    for (let d = 1; d <= lastDay.getDate(); d++) {
        const currentDateObj = new Date(year, month, d);
        const dateKey = formatDateKey(currentDateObj);
        
        // 在庫状況を取得（データがない場合は総在庫数とする）
        const stock = availabilityData[dateKey] !== undefined ? availabilityData[dateKey] : maxStock;
        
        const cell = document.createElement('div');
        cell.classList.add('date-cell');
        cell.dataset.date = dateKey;
        
        // ステータスと在庫数表示
        let statusClass = '';
        let stockText = '';
        
        if (stock === 0) {
            statusClass = 'unavailable';
            stockText = '予約済';
        } else if (stock > 0 && stock <= maxStock / 3) { // 在庫数が総在庫の1/3以下の場合を低在庫とする
            statusClass = 'low-stock';
            stockText = `残り${stock}台`;
        } else if (stock > 0) {
            statusClass = 'available';
            stockText = `残り${stock}台`;
        } else {
            // データ未取得（まだありえないが）
            stockText = '--';
        }

        // 過去の日付は予約不可
        if (currentDateObj < new Date(new Date().setHours(0,0,0,0))) {
            statusClass = 'unavailable';
            stockText = '過去日';
            cell.classList.remove('date-cell'); // 過去日はクリック不可にする
        }
        
        cell.classList.add(statusClass);
        cell.innerHTML = `<span>${d}</span><small>${stockText}</small>`;

        // クリックイベントのリスナーを追加
        if (statusClass !== 'unavailable') {
             cell.addEventListener('click', handleDateClick);
        }

        calendarView.appendChild(cell);
    }
    
    // 選択範囲のハイライトを再適用
    highlightSelection();
}

// js/main.js (続き)

/**
 * カレンダーの日付セルがクリックされたときの処理
 */
function handleDateClick(event) {
    const clickedDateStr = event.currentTarget.dataset.date;
    const clickedDate = new Date(clickedDateStr);

    if (!selectedStart || selectedStart && selectedEnd) {
        // 1. 開始日が未選択、または既に期間が選択済みの場合
        selectedStart = clickedDate;
        selectedEnd = null;
    } else if (clickedDate > selectedStart) {
        // 2. 終了日を開始日より後に選択した場合
        selectedEnd = clickedDate;
    } else if (clickedDate.getTime() === selectedStart.getTime()) {
        // 3. 開始日を再度クリックした場合（選択解除）
        selectedStart = null;
        selectedEnd = null;
    } else {
        // 4. 開始日より前の日を選択した場合 (開始日をリセット)
        selectedStart = clickedDate;
        selectedEnd = null;
    }

    highlightSelection();
    updateFormAndButton();
}


/**
 * 選択範囲をハイライトし、在庫不足がないか確認する
 */
function highlightSelection() {
    // 全てのセルからハイライトを削除
    document.querySelectorAll('.date-cell').forEach(cell => {
        cell.classList.remove('selected-start', 'selected-end', 'in-range');
        cell.title = '';
    });

    if (!selectedStart) {
        selectionStatus.textContent = 'カレンダーから開始日と終了日を選択してください。';
        return;
    }

    startDateInput.value = formatDateKey(selectedStart);
    endDateInput.value = selectedEnd ? formatDateKey(selectedEnd) : '未選択';

    let rangeValid = true;
    let tempDate = selectedStart;
    
    // 期間内の日付をハイライト
    while (tempDate && selectedEnd && tempDate <= selectedEnd) {
        const dateKey = formatDateKey(tempDate);
        const cell = document.querySelector(`.date-cell[data-date="${dateKey}"]`);
        
        if (cell) {
            cell.classList.add('in-range');
            
            // 期間内に在庫が0の日がないかチェック
            if (availabilityData[dateKey] === 0) {
                cell.title = '期間内に在庫がない日が含まれます。';
                rangeValid = false;
            }
        }
        
        tempDate = new Date(tempDate);
        tempDate.setDate(tempDate.getDate() + 1);
    }

    // 選択された開始日と終了日を特定
    const startCell = document.querySelector(`.date-cell[data-date="${formatDateKey(selectedStart)}"]`);
    if (startCell) startCell.classList.add('selected-start');
    
    if (selectedEnd) {
        const endCell = document.querySelector(`.date-cell[data-date="${formatDateKey(selectedEnd)}"]`);
        if (endCell) endCell.classList.add('selected-end');
    }
    
    // 期間内の在庫チェック結果をステータスに反映
    if (selectedStart && selectedEnd) {
        if (!rangeValid) {
             selectionStatus.textContent = '🚨 在庫が不足している日が含まれています。期間を変更してください。';
        } else {
             selectionStatus.textContent = '✅ 期間内の在庫は確保されています。フォームを記入してください。';
        }
    } else if (selectedStart) {
        selectionStatus.textContent = '終了日を選択してください。';
    }
}

// js/main.js (続き)

/**
 * フォームの状態をチェックし、予約ボタンの有効/無効を切り替える
 */
function updateFormAndButton() {
    const formValid = selectedStart && selectedEnd && 
                      document.getElementById('user-name').value.trim() !== '' &&
                      document.getElementById('user-email').value.trim() !== '' &&
                      // 在庫不足チェックも実施
                      checkRangeAvailability(selectedStart, selectedEnd); 
    
    submitButton.disabled = !formValid;
    
    if (selectedStart && selectedEnd && !checkRangeAvailability(selectedStart, selectedEnd)) {
        // 在庫不足の場合はボタンを無効化し、ステータスを更新
        submitButton.disabled = true;
        selectionStatus.textContent = '🚨 在庫が不足している日が含まれているため予約できません。';
    }
}

/**
 * 選択期間に在庫が0の日がないか確認するヘルパー
 */
function checkRangeAvailability(start, end) {
    if (!start || !end) return false;
    
    let tempDate = start;
    while (tempDate <= end) {
        const dateKey = formatDateKey(tempDate);
        if (availabilityData[dateKey] === 0) {
            return false;
        }
        tempDate = new Date(tempDate);
        tempDate.setDate(tempDate.getDate() + 1);
    }
    return true;
}


// --- 初期化とイベントリスナーの設定 ---

/**
 * 前月、次月ボタンのイベントハンドラ
 */
document.getElementById('prev-month').addEventListener('click', () => {
    currentDate.setMonth(currentDate.getMonth() - 1);
    fetchAvailability(currentDate);
});

document.getElementById('next-month').addEventListener('click', () => {
    currentDate.setMonth(currentDate.getMonth() + 1);
    fetchAvailability(currentDate);
});

// フォーム入力時にボタンの有効/無効を更新
document.getElementById('user-name').addEventListener('input', updateFormAndButton);
document.getElementById('user-email').addEventListener('input', updateFormAndButton);


// ページロード時に最初のデータを取得
document.addEventListener('DOMContentLoaded', () => {
    fetchAvailability(currentDate);
});

// js/main.js (続き)

/**
 * 予約フォーム送信時の処理（GASのdoPostを呼び出す）
 */
async function handleBookingSubmit(event) {
    event.preventDefault();

    if (!selectedStart || !selectedEnd) {
        alert('予約期間をカレンダーで選択してください。');
        return;
    }
    
    // フォームデータの収集
    const form = event.target;
    const formData = new FormData(form);
    
    // GASに送信するパラメータを準備
    const params = {
        action: 'registerBooking', // doPostで処理を振り分けるアクション名
        equipmentId: EQUIPMENT_ID,
        start: startDateInput.value,
        end: endDateInput.value,
        userEmail: formData.get('user-email'),
        userName: formData.get('user-name'),
        note: formData.get('note')
    };
    
    // URLSearchParamsに変換
    const queryString = new URLSearchParams(params).toString();
    
    try {
        submitButton.disabled = true;
        submitButton.textContent = '予約処理中...';

        const response = await fetch(GAS_URL, {
            method: 'POST', // POSTリクエストを使用
            // ボディではなく、クエリパラメータとしてデータを送信する (GASの標準)
            body: queryString, 
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded'
            }
        });

        const result = await response.json();
        
        if (result.status === 'success') {
            alert(`✅ 予約完了！予約ID: ${result.bookingId}`);
            
            // 予約成功後、カレンダーを再読み込みして最新の在庫を反映
            selectedStart = null;
            selectedEnd = null;
            form.reset();
            fetchAvailability(currentDate);
        } else {
            // 在庫不足エラーなど、GAS側で定義したエラー
            alert('❌ 予約失敗: ' + result.message);
        }
    } catch (error) {
        console.error('予約通信エラー:', error);
        alert('予約処理中に通信エラーが発生しました。');
    } finally {
        submitButton.textContent = '予約を確定する';
        updateFormAndButton(); // ボタンの状態を再評価
    }
}

// フォーム送信イベントリスナー
document.getElementById('booking-form').addEventListener('submit', handleBookingSubmit);