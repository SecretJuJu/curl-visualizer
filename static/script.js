async function parseCurl() {
    const curlInput = document.getElementById('curlInput').value;
    
    try {
        const response = await fetch('/parse-curl', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ curl: curlInput })
        });
        
        const data = await response.json();
        
        // URL 설정
        document.getElementById('url').value = data.url;
        
        // 메서드 설정
        document.getElementById('method').value = data.method;
        
        // 헤더 설정
        const headersContainer = document.getElementById('headers');
        headersContainer.innerHTML = ''; // 기존 헤더 초기화
        
        Object.entries(data.headers).forEach(([key, value]) => {
            if (key.trim() && value.trim()) {  // 빈 헤더는 건너뛰기
                addHeader(key.trim(), value.trim());
            }
        });
        
        // 요청 본문 설정
        document.getElementById('requestBody').value = data.body;
        
    } catch (error) {
        alert('CURL 명령어 파싱 중 오류가 발생했습니다.');
    }
}

function addHeader(key = '', value = '') {
    const headersContainer = document.getElementById('headers');
    const headerRow = document.createElement('div');
    headerRow.className = 'header-row';
    
    headerRow.innerHTML = `
        <input type="text" placeholder="키" value="${key.trim()}">
        <input type="text" placeholder="값" value="${value.trim()}">
        <button onclick="this.parentElement.remove()">-</button>
    `;
    
    headersContainer.appendChild(headerRow);
}

async function sendRequest() {
    const method = document.getElementById('method').value;
    const url = document.getElementById('url').value;
    const headers = {};
    const headerRows = document.querySelectorAll('.header-row');
    
    headerRows.forEach(row => {
        const inputs = row.querySelectorAll('input');
        const key = inputs[0].value.trim();
        const value = inputs[1].value.trim();
        if (key && value) {  // 키와 값이 모두 있는 경우만 추가
            headers[key] = value;
        }
    });

    const requestBody = document.getElementById('requestBody').value;
    
    try {
        const startTime = performance.now();
        
        const response = await fetch('/send-request', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                method: method,
                url: url,
                headers: headers,
                body: requestBody
            })
        });

        const endTime = performance.now();
        const data = await response.json();
        
        if (data.error) {
            throw new Error(data.error);
        }
        
        // 응답 표시
        document.getElementById('statusCode').textContent = data.status;
        document.getElementById('responseTime').textContent = `${Math.round(endTime - startTime)}ms`;
        document.getElementById('responseBody').textContent = data.body;
        
    } catch (error) {
        alert('요청 중 오류가 발생했습니다: ' + error.message);
    }
}

// JWT 관련 함수들
function showJwtTab(tab) {
    document.querySelectorAll('.jwt-content').forEach(content => content.style.display = 'none');
    document.getElementById(`jwt-${tab}`).style.display = 'block';
    
    document.querySelectorAll('.jwt-tabs button').forEach(btn => btn.classList.remove('active'));
    event.target.classList.add('active');
}

async function encodeJWT() {
    try {
        let payload = document.getElementById('jwtPayload').value;
        const secret = document.getElementById('jwtSecret').value;
        const algorithm = document.getElementById('jwtAlgorithm').value;
        const extendExpiry = document.getElementById('extendExpiry').checked;

        // 페이로드를 파싱
        try {
            payload = JSON.parse(payload);
        } catch (e) {
            throw new Error('페이로드가 유효한 JSON 형식이 아닙니다.');
        }

        // 만료 기한 설정이 체크되어 있으면 exp 추가
        if (extendExpiry) {
            // 2999년 12월 31일 23:59:59 UTC의 타임스탬프
            payload.exp = 32503680000;
        }

        const response = await fetch('/jwt/encode', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                payload: JSON.stringify(payload),  // 수정된 페이로드를 문자열로 변환
                secret,
                algorithm
            })
        });

        const data = await response.json();
        if (data.error) {
            throw new Error(data.error);
        }

        document.getElementById('jwtResult').value = data.token;
    } catch (error) {
        alert('JWT 인코딩 중 오류가 발생했습니다: ' + error.message);
    }
}

function saveSecret(key, value) {
    localStorage.setItem(key, value);
}

function loadSecret(key) {
    return localStorage.getItem(key) || '';
}

function toggleSecretVisibility(inputId) {
    const input = document.getElementById(inputId);
    input.type = input.type === 'password' ? 'text' : 'password';
}

// 페이지 로드 시 저장된 시크릿 키 불러오기
document.addEventListener('DOMContentLoaded', () => {
    loadRequests();
    
    // 저장된 시크릿 키 불러오기
    document.getElementById('jwtSecret').value = loadSecret('jwtEncodeSecret');
    document.getElementById('jwtDecodeSecret').value = loadSecret('jwtDecodeSecret');
    
    // 시크릿 키 입력 시 자동 저장
    document.getElementById('jwtSecret').addEventListener('input', (e) => {
        saveSecret('jwtEncodeSecret', e.target.value);
    });
    
    document.getElementById('jwtDecodeSecret').addEventListener('input', (e) => {
        saveSecret('jwtDecodeSecret', e.target.value);
    });
});

async function decodeJWT() {
    try {
        const token = document.getElementById('jwtToken').value;
        const secret = document.getElementById('jwtDecodeSecret').value;

        const response = await fetch('/jwt/decode', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                token,
                secret
            })
        });

        const data = await response.json();
        if (data.error) {
            throw new Error(data.error);
        }

        // 결과 표시
        document.getElementById('jwtDecodeResult').value = JSON.stringify(data.payload, null, 2);
        
        // 검증 상태 표시
        const verificationStatus = document.getElementById('verificationStatus');
        if (secret) {
            if (data.verified) {
                verificationStatus.textContent = '✓ 서명이 유효합니다';
                verificationStatus.className = 'verification-status verified';
            } else {
                verificationStatus.textContent = '⚠ 서명이 유효하지 않습니다';
                verificationStatus.className = 'verification-status unverified';
            }
        } else {
            verificationStatus.textContent = 'ℹ 서명 검증을 건너뛰었습니다';
            verificationStatus.className = 'verification-status';
        }
    } catch (error) {
        alert('JWT 디코딩 중 오류가 발생했습니다: ' + error.message);
    }
}

// 요청 저장/불러오기 관련 함수들
async function saveRequest() {
    try {
        const name = document.getElementById('requestName').value;
        if (!name) {
            alert('요청 이름을 입력해주세요.');
            return;
        }

        const method = document.getElementById('method').value;
        const url = document.getElementById('url').value;
        const headers = {};
        document.querySelectorAll('.header-row').forEach(row => {
            const inputs = row.querySelectorAll('input');
            const key = inputs[0].value.trim();
            const value = inputs[1].value.trim();
            if (key && value) {
                headers[key] = value;
            }
        });
        const body = document.getElementById('requestBody').value;

        const response = await fetch('/requests', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                name,
                method,
                url,
                headers,
                body
            })
        });

        const data = await response.json();
        if (data.error) {
            throw new Error(data.error);
        }

        alert('요청이 저장되었습니다.');
        loadRequests();
    } catch (error) {
        alert('요청 저장 중 오류가 발생했습니다: ' + error.message);
    }
}

async function loadRequests() {
    try {
        const response = await fetch('/requests');
        const requests = await response.json();

        const tbody = document.querySelector('#requestsTable tbody');
        tbody.innerHTML = '';

        requests.forEach(request => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>${request.name}</td>
                <td>${request.method}</td>
                <td>${request.url}</td>
                <td>${new Date(request.created_at).toLocaleString()}</td>
                <td class="request-actions">
                    <button onclick="loadRequest(${request.id})" class="action-button load">불러오기</button>
                    <button onclick="editRequest(${request.id})" class="action-button edit">수정</button>
                    <button onclick="deleteRequest(${request.id})" class="action-button delete">삭제</button>
                </td>
            `;
            tbody.appendChild(tr);
        });
    } catch (error) {
        alert('요청 목록을 불러오는 중 오류가 발생했습니다: ' + error.message);
    }
}

async function loadRequest(id) {
    try {
        const response = await fetch(`/requests/${id}`);
        const request = await response.json();

        document.getElementById('method').value = request.method;
        document.getElementById('url').value = request.url;
        document.getElementById('requestBody').value = request.body;
        document.getElementById('requestName').value = request.name;

        const headersContainer = document.getElementById('headers');
        headersContainer.innerHTML = '';
        Object.entries(request.headers).forEach(([key, value]) => {
            addHeader(key, value);
        });
    } catch (error) {
        alert('요청을 불러오는 중 오류가 발생했습니다: ' + error.message);
    }
}

function copyToClipboard(elementId) {
    const element = document.getElementById(elementId);
    element.select();
    document.execCommand('copy');
}

// 요청 삭제 함수
async function deleteRequest(id) {
    if (!confirm('정말 이 요청을 삭제하시겠습니까?')) {
        return;
    }

    try {
        const response = await fetch(`/requests/${id}`, {
            method: 'DELETE'
        });

        const data = await response.json();
        if (data.error) {
            throw new Error(data.error);
        }

        alert('요청이 삭제되었습니다.');
        loadRequests();  // 목록 새로고침
    } catch (error) {
        alert('요청 삭제 중 오류가 발생했습니다: ' + error.message);
    }
}

// 요청 수정 함수
async function updateRequest(id) {
    try {
        const name = document.getElementById('requestName').value;
        if (!name) {
            alert('요청 이름을 입력해주세요.');
            return;
        }

        const method = document.getElementById('method').value;
        const url = document.getElementById('url').value;
        const headers = {};
        document.querySelectorAll('.header-row').forEach(row => {
            const inputs = row.querySelectorAll('input');
            const key = inputs[0].value.trim();
            const value = inputs[1].value.trim();
            if (key && value) {
                headers[key] = value;
            }
        });
        const body = document.getElementById('requestBody').value;

        const response = await fetch(`/requests/${id}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                name,
                method,
                url,
                headers,
                body
            })
        });

        const data = await response.json();
        if (data.error) {
            throw new Error(data.error);
        }

        alert('요청이 수정되었습니다.');
        loadRequests();  // 목록 새로고침
        
        // 수정 모드 종료
        document.getElementById('requestName').value = '';
        document.querySelector('.save-request button').textContent = '현재 요청 저장';
        document.querySelector('.save-request button').onclick = saveRequest;
    } catch (error) {
        alert('요청 수정 중 오류가 발생했습니다: ' + error.message);
    }
}

// 수정 모드로 전환하는 함수
async function editRequest(id) {
    try {
        const response = await fetch(`/requests/${id}`);
        const request = await response.json();

        // 폼에 데이터 채우기
        document.getElementById('method').value = request.method;
        document.getElementById('url').value = request.url;
        document.getElementById('requestBody').value = request.body;
        document.getElementById('requestName').value = request.name;

        const headersContainer = document.getElementById('headers');
        headersContainer.innerHTML = '';
        Object.entries(request.headers).forEach(([key, value]) => {
            addHeader(key, value);
        });

        // 저장 버튼을 수정 버튼으로 변경
        const saveButton = document.querySelector('.save-request button');
        saveButton.textContent = '요청 수정하기';
        saveButton.onclick = () => updateRequest(id);
    } catch (error) {
        alert('요청을 불러오는 중 오류가 발생했습니다: ' + error.message);
    }
}

// 페이지 로드 시 저장된 요청 목록 불러오기
document.addEventListener('DOMContentLoaded', () => {
    loadRequests();
}); 