// --- FIREBASE CONFIGURATION (Aapki Keys Ke Saath) ---
const firebaseConfig = {
    apiKey: "AIzaSyBS-vu5WrKpR-67uJgyV0SuBCP0Lmucx-k",
    authDomain: "pm-roit.firebaseapp.com",
    databaseURL: "https://pm-roit-default-rtdb.europe-west1.firebasedatabase.app",
    projectId: "pm-roit",
    storageBucket: "pm-roit.firebasestorage.app",
    messagingSenderId: "360612536936",
    appId: "1:360612536936:web:bbfc54f9cf4744abe051dd"
};

// Firebase Initialize (Compat Mode)
firebase.initializeApp(firebaseConfig);
const db = firebase.database();

let selectedIDs = [];
let currentSPhoto = "";

// 1. Image Preview Helper (Student, QR, Signature ke liye)
function previewImg(input, id) {
    const reader = new FileReader();
    reader.onload = e => {
        const res = e.target.result;
        document.getElementById(id).src = res;
        document.getElementById(id).style.display = 'block';
        if(id === 'sPreview') currentSPhoto = res;
    };
    if(input.files[0]) reader.readAsDataURL(input.files[0]);
}

// 2. Save Coaching Branding Settings
function saveSettings() {
    const data = {
        name: document.getElementById('cName').value,
        phone: document.getElementById('cPhone').value,
        addr: document.getElementById('cAddr').value,
        qr: document.getElementById('qrPreview').src,
        sig: document.getElementById('sigPreview').src
    };
    db.ref('settings').set(data).then(() => alert("Coaching Branding Updated! ✅"));
}

// 3. Register New Student
function registerStudent() {
    const name = document.getElementById('sName').value;
    const cls = document.getElementById('sClass').value;
    const total = document.getElementById('sTotal').value;

    if(!name || !total) return alert("Bhai, Naam aur Total Fees toh daal do!");

    const id = Date.now();
    db.ref('students/' + id).set({
        id, name, class: cls, total: parseInt(total), paid: 0, photo: currentSPhoto
    }).then(() => {
        alert("Student Registered Successfully! 🎯");
        location.reload(); 
    });
}

// 4. Load & Filter Students from Firebase
function loadStudents() {
    const filter = document.getElementById('filterCls').value;
    db.ref('students').on('value', snap => {
        const list = document.getElementById('studentList');
        list.innerHTML = "";
        
        if(!snap.exists()) {
            list.innerHTML = "<p style='text-align:center; color:#555;'>No students found.</p>";
            return;
        }

        snap.forEach(child => {
            const s = child.val();
            if(filter !== "All" && s.class !== filter) return;

            const bal = s.total - s.paid;
            const statusClass = bal <= 0 ? 'paid-ok' : 'unpaid';

            list.innerHTML += `
                <div class="student-card" id="row-${s.id}">
                    <input type="checkbox" class="checkbox-custom" onchange="toggleSelect(${s.id})">
                    <img src="${s.photo || 'https://via.placeholder.com/50'}" style="width:45px; height:45px; border-radius:50%; object-fit:cover;">
                    <div style="flex:1;">
                        <strong style="font-size:1rem;">${s.name}</strong><br>
                        <span style="font-size:0.75rem; color:#888;">Class: ${s.class} | Due: ₹${bal}</span>
                    </div>
                    <button class="btn" style="padding:5px 10px; font-size:12px; background:#222; color:var(--primary); border:1px solid #444;" onclick="showReceipt(${s.id})">📄 Receipt</button>
                </div>`;
        });
    });
}

// 5. Multi-Select & Bulk Actions
function toggleSelect(id) {
    const idx = selectedIDs.indexOf(id);
    if(idx > -1) selectedIDs.splice(idx, 1); else selectedIDs.push(id);
    
    document.getElementById(`row-${id}`).classList.toggle('selected');
    const bar = document.getElementById('bulkBar');
    bar.style.display = selectedIDs.length > 0 ? 'flex' : 'none';
    document.getElementById('selCount').innerText = selectedIDs.length + " Selected";
}

function bulkFeeUpdate() {
    const amt = parseInt(document.getElementById('bulkAmt').value);
    if(!amt) return alert("Pehle amount toh likho!");

    selectedIDs.forEach(id => {
        db.ref('students/' + id).transaction(currentData => {
            if(currentData) {
                currentData.paid = (currentData.paid || 0) + amt;
            }
            return currentData;
        });
    });
    alert("Fees Updated for selected students! 💰");
    selectedIDs = [];
    loadStudents();
}

function deleteSelected() {
    if(!confirm("Kya aap sach mein in students ko delete karna chahte hain?")) return;
    selectedIDs.forEach(id => db.ref('students/' + id).remove());
    selectedIDs = [];
}

// 6. Receipt System
function showReceipt(id) {
    db.ref('students/' + id).once('value', sSnap => {
        db.ref('settings').once('value', bSnap => {
            const s = sSnap.val();
            const b = bSnap.val() || { name: "Your Coaching", addr: "Address", phone: "000", qr: "", sig: "" };

            document.getElementById('rCoachingName').innerText = b.name;
            document.getElementById('rCoachingAddr').innerText = b.addr;
            document.getElementById('rCoachingPhone').innerText = "Mob: " + b.phone;
            document.getElementById('rStdName').innerText = s.name;
            document.getElementById('rStdClass').innerText = s.class;
            document.getElementById('rAmount').innerText = "₹" + s.paid;
            document.getElementById('rBalance').innerText = "₹" + (s.total - s.paid);
            document.getElementById('rStdPhoto').src = s.photo;
            document.getElementById('rQR').src = b.qr;
            document.getElementById('rSig').src = b.sig;
            
            document.getElementById('receiptModal').style.display = 'block';
        });
    });
}

function closeReceipt() {
    document.getElementById('receiptModal').style.display = 'none';
}

// 7. Initial Page Load (Fetch Branding & List)
window.onload = () => {
    loadStudents();
    db.ref('settings').once('value', s => {
        const d = s.val();
        if(d) {
            document.getElementById('cName').value = d.name || "";
            document.getElementById('cPhone').value = d.phone || "";
            document.getElementById('cAddr').value = d.addr || "";
            document.getElementById('qrPreview').src = d.qr || "";
            document.getElementById('sigPreview').src = d.sig || "";
        }
    });
};
