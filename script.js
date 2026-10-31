// ================= Ayarlar =================
const DOGRU_CEVAP = 'BOFU';
const MUM_SAYISI = 5;
const OYUN_SURESI = 30; // saniye
const CAN_SAYISI = 3;

// ================= Ekran geçişleri =================
let aktifEkran = 'ekran-kapi';

function goster(id) {
  if (aktifEkran === 'ekran-oyun') oyunuDurdur();
  if (aktifEkran === 'ekran-mum') mikrofonuKapat();

  document.querySelectorAll('.ekran').forEach((e) => e.classList.toggle('aktif', e.id === id));
  aktifEkran = id;

  if (id === 'ekran-oyun') oyunEkraniniAc();
  if (id === 'ekran-mum') mumEkraniniAc();
}

document.addEventListener('click', (e) => {
  const btn = e.target.closest('[data-git]');
  if (btn) goster(btn.dataset.git);
});

// Bir CSS animasyonunu baştan oynatır
function animasyonuTekrarla(el, sinif) {
  el.classList.remove(sinif);
  void el.offsetWidth;
  el.classList.add(sinif);
}

// ================= 1. Kim o? =================
const kapi = document.querySelector('.kapi');
const kapiForm = document.getElementById('kapi-form');
const cevapInput = document.getElementById('cevap');
const mesaj = document.getElementById('mesaj');
const YANLIS_MESAJLARI = [
  'Yanlış! 🙅',
  'Yanlış! Bir daha dene 🤔',
  'Yanlış! Hiç yaklaşamadın 😅',
  'Yanlış! Biraz daha düşün 🧐',
];
let yanlisSayisi = 0;
let kapiAcildi = false;

cevapInput.focus();

kapiForm.addEventListener('submit', (e) => {
  e.preventDefault();
  if (kapiAcildi) return;

  const cevap = cevapInput.value.trim().toLocaleUpperCase('tr-TR');
  if (!cevap) {
    cevapInput.focus();
    return;
  }

  if (cevap === DOGRU_CEVAP) {
    kapiAcildi = true;
    sesiHazirla(); // ses, kullanıcı tıkladığı anda açılmalı
    mesaj.textContent = 'Doğru! 🎉';
    mesaj.className = 'mesaj dogru';
    animasyonuTekrarla(mesaj, 'zipla');
    cevapInput.blur();
    setTimeout(() => kapi.classList.add('aciliyor'), 400);
    setTimeout(() => {
      goster('ekran-kutlama');
      konfetiPatlat(220);
      melodiCal();
    }, 1100);
  } else {
    mesaj.textContent = YANLIS_MESAJLARI[yanlisSayisi % YANLIS_MESAJLARI.length];
    yanlisSayisi++;
    mesaj.className = 'mesaj yanlis';
    animasyonuTekrarla(mesaj, 'zipla');
    animasyonuTekrarla(kapiForm, 'salla');
    cevapInput.select();
  }
});

// ================= Ses: "İyi ki doğdun" melodisi =================
let sesBaglami = null;
let melodiCikis = null;

function sesiHazirla() {
  if (!sesBaglami) {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    sesBaglami = new AC();
  }
  if (sesBaglami.state === 'suspended') sesBaglami.resume();
  return sesBaglami;
}

const NOTA = {
  G4: 392.0, A4: 440.0, B4: 493.88, C5: 523.25,
  D5: 587.33, E5: 659.25, F5: 698.46, G5: 783.99,
};
const IYI_KI_DOGDUN = [
  ['G4', 0.75], ['G4', 0.25], ['A4', 1], ['G4', 1], ['C5', 1], ['B4', 2],
  ['G4', 0.75], ['G4', 0.25], ['A4', 1], ['G4', 1], ['D5', 1], ['C5', 2],
  ['G4', 0.75], ['G4', 0.25], ['G5', 1], ['E5', 1], ['C5', 1], ['B4', 1], ['A4', 2],
  ['F5', 0.75], ['F5', 0.25], ['E5', 1], ['C5', 1], ['D5', 1], ['C5', 3],
];

function melodiCal() {
  const ctx = sesiHazirla();
  if (!ctx) return;
  melodiDurdur();

  const cikis = ctx.createGain();
  cikis.gain.value = 0.2;
  cikis.connect(ctx.destination);
  melodiCikis = cikis;

  const vurus = 0.36; // bir vuruşun süresi (sn)
  let t = ctx.currentTime + 0.1;
  for (const [nota, sure] of IYI_KI_DOGDUN) {
    const uzunluk = sure * vurus;
    // Ana ses + bir oktav üstte hafif çan sesi
    [[1, 'triangle', 1], [2, 'sine', 0.25]].forEach(([carpan, tip, guc]) => {
      const osc = ctx.createOscillator();
      const zarf = ctx.createGain();
      osc.type = tip;
      osc.frequency.value = NOTA[nota] * carpan;
      zarf.gain.setValueAtTime(0.0001, t);
      zarf.gain.exponentialRampToValueAtTime(guc, t + 0.02);
      zarf.gain.exponentialRampToValueAtTime(0.0001, t + uzunluk * 0.95);
      osc.connect(zarf).connect(cikis);
      osc.start(t);
      osc.stop(t + uzunluk);
    });
    t += uzunluk;
  }
}

function melodiDurdur() {
  if (!melodiCikis || !sesBaglami) return;
  const eski = melodiCikis;
  const simdi = sesBaglami.currentTime;
  eski.gain.cancelScheduledValues(simdi);
  eski.gain.setValueAtTime(eski.gain.value, simdi);
  eski.gain.linearRampToValueAtTime(0, simdi + 0.15);
  setTimeout(() => eski.disconnect(), 300);
  melodiCikis = null;
}

// ================= Konfeti =================
const konfetiCanvas = document.getElementById('konfeti');
const kctx = konfetiCanvas.getContext('2d');
const RENKLER = ['#D9572B', '#F2B134', '#2E9E8F', '#F7B2C0', '#5B7FDB', '#FFF9EF', '#FF5C7A'];
let parcaciklar = [];
let konfetiRaf = null;
let konfetiSon = 0;

function konfetiBoyutla() {
  const dpr = window.devicePixelRatio || 1;
  konfetiCanvas.width = innerWidth * dpr;
  konfetiCanvas.height = innerHeight * dpr;
  kctx.setTransform(dpr, 0, 0, dpr, 0, 0);
}
konfetiBoyutla();
addEventListener('resize', konfetiBoyutla);

function rastgele(min, max) {
  return min + Math.random() * (max - min);
}

// Sol ve sağ alt köşeden iki konfeti topu patlatır
function konfetiPatlat(adet = 160) {
  const W = innerWidth;
  const H = innerHeight;
  const g = 1400;
  for (let i = 0; i < adet; i++) {
    const soldan = i % 2 === 0;
    parcaciklar.push({
      x: soldan ? -10 : W + 10,
      y: H + 10,
      vx: (soldan ? 1 : -1) * rastgele(0.15, 0.7) * W,
      vy: -Math.sqrt(2 * g * H * rastgele(0.45, 1)),
      g,
      w: rastgele(6, 11),
      h: rastgele(10, 18),
      renk: RENKLER[Math.floor(Math.random() * RENKLER.length)],
      aci: rastgele(0, Math.PI * 2),
      vAci: rastgele(-8, 8),
      faz: rastgele(0, Math.PI * 2),
      vFaz: rastgele(6, 14),
    });
  }
  if (!konfetiRaf) {
    konfetiSon = performance.now();
    konfetiRaf = requestAnimationFrame(konfetiDongu);
  }
}

function konfetiDongu(t) {
  const dt = Math.min(0.05, (t - konfetiSon) / 1000);
  konfetiSon = t;
  const H = innerHeight;
  kctx.clearRect(0, 0, innerWidth, H);

  for (const p of parcaciklar) {
    p.vy += p.g * dt;
    if (p.vy > 240) p.vy = 240; // yavaşça süzülerek düşsün
    p.vx *= Math.pow(0.35, dt);
    p.x += (p.vx + Math.sin(p.faz) * 40) * dt;
    p.y += p.vy * dt;
    p.aci += p.vAci * dt;
    p.faz += p.vFaz * dt;

    kctx.save();
    kctx.translate(p.x, p.y);
    kctx.rotate(p.aci);
    kctx.scale(1, Math.cos(p.faz));
    kctx.fillStyle = p.renk;
    kctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
    kctx.restore();
  }
  parcaciklar = parcaciklar.filter((p) => p.y < H + 40);

  if (parcaciklar.length) {
    konfetiRaf = requestAnimationFrame(konfetiDongu);
  } else {
    kctx.clearRect(0, 0, innerWidth, H);
    konfetiRaf = null;
  }
}

// ================= 3. Mini oyun: Pasta Yakala =================
const oyunCanvas = document.getElementById('oyun');
const octx = oyunCanvas.getContext('2d');
const skorEl = document.getElementById('skor');
const canEl = document.getElementById('can');
const sureEl = document.getElementById('sure');
const perde = document.getElementById('perde');
const perdeBaslik = document.getElementById('perde-baslik');
const perdeMetin = document.getElementById('perde-metin');
const baslaBtn = document.getElementById('oyun-basla');

const IYI_NESNELER = [
  { e: '🎂', p: 10 }, { e: '🍰', p: 10 }, { e: '🧁', p: 5 }, { e: '🎁', p: 15 },
];
const KOTU_NESNELER = ['📅', '📧', '⏰'];
const EMOJI_FONT = '"Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",sans-serif';

const oyun = {
  w: 0, h: 0, boyut: 44,
  x: 0, hedefX: 0,
  nesneler: [], yazilar: [],
  skor: 0, can: CAN_SAYISI, gecen: 0, uretim: 0,
  calisiyor: false, raf: null, son: 0, sarsinti: 0,
};
const tuslar = { sol: false, sag: false };

function oyunBoyutla() {
  const r = oyunCanvas.getBoundingClientRect();
  const dpr = window.devicePixelRatio || 1;
  oyunCanvas.width = Math.round(r.width * dpr);
  oyunCanvas.height = Math.round(r.height * dpr);
  octx.setTransform(dpr, 0, 0, dpr, 0, 0);
  oyun.w = r.width;
  oyun.h = r.height;
  oyun.boyut = Math.max(34, Math.min(56, Math.min(r.width, r.height) * 0.08));
  oyun.x = sinirla(oyun.x || r.width / 2);
  oyun.hedefX = sinirla(oyun.hedefX || oyun.x);
}

function sinirla(x) {
  const pay = oyun.boyut * 0.8;
  return Math.max(pay, Math.min(oyun.w - pay, x));
}

const oyuncuY = () => oyun.h - 18 - oyun.boyut * 0.8;

function oyunEkraniniAc() {
  oyunBoyutla();
  oyun.x = oyun.hedefX = oyun.w / 2;
  oyun.nesneler = [];
  oyun.yazilar = [];
  perdeBaslik.textContent = 'Pasta Yakala! 🎂';
  perdeMetin.innerHTML =
    '<p>🎂 🧁 🎁 yakala, 📅 toplantılardan ve 📧 maillerden kaç!</p>' +
    `<p class="kucuk">Fareyle, parmağınla ya da ← → tuşlarıyla oyna. ${CAN_SAYISI} canın ve ${OYUN_SURESI} saniyen var.</p>`;
  baslaBtn.textContent = 'Başla';
  perde.hidden = false;
  gostergeleriGuncelle();
  ciz();
}

function oyunuBaslat() {
  Object.assign(oyun, {
    nesneler: [], yazilar: [], skor: 0, can: CAN_SAYISI,
    gecen: 0, uretim: 0.3, sarsinti: 0, calisiyor: true,
  });
  perde.hidden = true;
  gostergeleriGuncelle();
  oyun.son = performance.now();
  oyun.raf = requestAnimationFrame(oyunDongusu);
}

function oyunuDurdur() {
  oyun.calisiyor = false;
  if (oyun.raf) cancelAnimationFrame(oyun.raf);
  oyun.raf = null;
  tuslar.sol = tuslar.sag = false;
}

function gostergeleriGuncelle() {
  skorEl.textContent = oyun.skor;
  canEl.textContent = '❤️'.repeat(oyun.can) + '🤍'.repeat(CAN_SAYISI - oyun.can);
  sureEl.textContent = Math.ceil(Math.max(0, OYUN_SURESI - oyun.gecen));
}

function nesneUret(zorluk) {
  const kotu = Math.random() < 0.25 + 0.15 * zorluk;
  const secim = kotu
    ? { e: KOTU_NESNELER[Math.floor(Math.random() * KOTU_NESNELER.length)], p: 0 }
    : IYI_NESNELER[Math.floor(Math.random() * IYI_NESNELER.length)];
  oyun.nesneler.push({
    e: secim.e,
    p: secim.p,
    kotu,
    x: rastgele(oyun.boyut, oyun.w - oyun.boyut),
    y: -oyun.boyut,
    vy: (oyun.h * 0.35 + Math.random() * oyun.h * 0.2) * (1 + zorluk * 0.9),
    aci: rastgele(-0.3, 0.3),
    vAci: rastgele(-1.5, 1.5),
  });
}

function oyunDongusu(t) {
  if (!oyun.calisiyor) return;
  const dt = Math.min(0.05, (t - oyun.son) / 1000);
  oyun.son = t;

  oyun.gecen += dt;
  const zorluk = Math.min(1, oyun.gecen / OYUN_SURESI);

  // Yeni nesne
  oyun.uretim -= dt;
  if (oyun.uretim <= 0) {
    nesneUret(zorluk);
    oyun.uretim = 0.75 - 0.4 * zorluk;
  }

  // Oyuncu hareketi
  if (tuslar.sol) oyun.hedefX -= 700 * dt;
  if (tuslar.sag) oyun.hedefX += 700 * dt;
  oyun.hedefX = sinirla(oyun.hedefX);
  oyun.x += (oyun.hedefX - oyun.x) * Math.min(1, dt * 14);

  // Düşen nesneler ve yakalama
  const py = oyuncuY();
  oyun.nesneler = oyun.nesneler.filter((n) => {
    n.y += n.vy * dt;
    n.aci += n.vAci * dt;
    if (Math.hypot(n.x - oyun.x, n.y - py) < oyun.boyut * 1.05) {
      if (n.kotu) {
        oyun.can--;
        oyun.sarsinti = 1;
        oyun.yazilar.push({ x: n.x, y: n.y, metin: '-1 ❤️', renk: '#A9401C', omur: 0.9 });
      } else {
        oyun.skor += n.p;
        oyun.yazilar.push({ x: n.x, y: n.y, metin: `+${n.p}`, renk: '#2E8B57', omur: 0.9 });
      }
      gostergeleriGuncelle();
      return false;
    }
    return n.y < oyun.h + oyun.boyut;
  });

  // Uçan skor yazıları
  oyun.yazilar = oyun.yazilar.filter((y) => {
    y.y -= 60 * dt;
    y.omur -= dt;
    return y.omur > 0;
  });
  oyun.sarsinti = Math.max(0, oyun.sarsinti - dt * 4);

  sureEl.textContent = Math.ceil(Math.max(0, OYUN_SURESI - oyun.gecen));
  ciz();

  if (oyun.can <= 0) return oyunBitti('Toplantılar seni yakaladı 😵');
  if (oyun.gecen >= OYUN_SURESI) return oyunBitti('Süre doldu! ⏱');
  oyun.raf = requestAnimationFrame(oyunDongusu);
}

function ciz() {
  const { w, h, boyut } = oyun;
  octx.clearRect(0, 0, w, h);
  octx.save();
  if (oyun.sarsinti > 0) {
    const s = oyun.sarsinti * 14;
    octx.translate(rastgele(-s, s), rastgele(-s, s));
  }

  // Zemin
  octx.fillStyle = 'rgba(42, 31, 23, .08)';
  octx.fillRect(-20, h - 18, w + 40, 38);

  octx.textAlign = 'center';
  octx.textBaseline = 'middle';
  octx.fillStyle = '#000'; // emojiler yarı saydam çizilmesin

  // Nesneler
  octx.font = `${boyut}px ${EMOJI_FONT}`;
  for (const n of oyun.nesneler) {
    octx.save();
    octx.translate(n.x, n.y);
    octx.rotate(n.aci);
    octx.fillText(n.e, 0, 0);
    octx.restore();
  }

  // Oyuncu
  octx.font = `${boyut * 1.5}px ${EMOJI_FONT}`;
  octx.fillText('🥳', oyun.x, oyuncuY());

  // Yazılar
  octx.font = `800 ${Math.round(boyut * 0.55)}px 'Bricolage Grotesque', sans-serif`;
  for (const y of oyun.yazilar) {
    octx.globalAlpha = Math.min(1, y.omur / 0.5);
    octx.fillStyle = y.renk;
    octx.fillText(y.metin, y.x, y.y);
  }
  octx.globalAlpha = 1;
  octx.restore();

  // Kötü nesne yakalanınca kırmızı parlama
  if (oyun.sarsinti > 0) {
    octx.fillStyle = `rgba(217, 87, 43, ${oyun.sarsinti * 0.25})`;
    octx.fillRect(0, 0, w, h);
  }
}

function unvanBul(skor) {
  if (skor >= 300) return 'Pasta Efsanesi 🔥';
  if (skor >= 180) return 'Toplantı Kaçakçısı 🏃';
  if (skor >= 80) return 'Kahve Molası Ustası ☕';
  return 'Isınma Turu 🐣';
}

function oyunBitti(baslik) {
  oyunuDurdur();
  gostergeleriGuncelle();
  perdeBaslik.textContent = baslik;
  perdeMetin.innerHTML =
    `<p>Skorun: <b>${oyun.skor}</b><br>Ünvanın: <b>${unvanBul(oyun.skor)}</b></p>` +
    '<p class="final">Ama sonuç ne olursa olsun:<br><b>Dünyanın En İyi Patronu 🏆</b></p>';
  baslaBtn.textContent = 'Tekrar Oyna';
  perde.hidden = false;
  konfetiPatlat(140);
}

baslaBtn.addEventListener('click', oyunuBaslat);

function isaretciyiTakip(e) {
  const r = oyunCanvas.getBoundingClientRect();
  oyun.hedefX = e.clientX - r.left;
}
oyunCanvas.addEventListener('pointermove', isaretciyiTakip);
oyunCanvas.addEventListener('pointerdown', isaretciyiTakip);

addEventListener('keydown', (e) => {
  if (aktifEkran !== 'ekran-oyun') return;
  if (e.key === 'ArrowLeft' || e.key === 'a') tuslar.sol = true;
  if (e.key === 'ArrowRight' || e.key === 'd') tuslar.sag = true;
});
addEventListener('keyup', (e) => {
  if (e.key === 'ArrowLeft' || e.key === 'a') tuslar.sol = false;
  if (e.key === 'ArrowRight' || e.key === 'd') tuslar.sag = false;
});

addEventListener('resize', () => {
  if (aktifEkran !== 'ekran-oyun') return;
  oyunBoyutla();
  if (!oyun.calisiyor) ciz();
});

// ================= 4. Mumları üfle =================
const mumlarEl = document.getElementById('mumlar');
const mumDurum = document.getElementById('mum-durum');
const mumIpucu = document.getElementById('mum-ipucu');
const tekrarYakBtn = document.getElementById('tekrar-yak');
const nefesEl = document.getElementById('nefes');
const IPUCU_METNI = mumIpucu.textContent;

for (let i = 0; i < MUM_SAYISI; i++) {
  const mum = document.createElement('button');
  mum.className = 'mum';
  mum.setAttribute('aria-label', `${i + 1}. mum`);
  mum.innerHTML = '<span class="alev"></span><span class="duman"></span>';
  mum.addEventListener('click', () => mumuSondur(mum));
  mumlarEl.appendChild(mum);
}

function mumuSondur(mum) {
  if (!mum || mum.classList.contains('sondu')) return;
  mum.classList.add('sondu');
  if (!mumlarEl.querySelector('.mum:not(.sondu)')) hepsiSondu();
}

function rastgeleMumSondur() {
  const yananlar = [...mumlarEl.querySelectorAll('.mum:not(.sondu)')];
  if (yananlar.length) mumuSondur(yananlar[Math.floor(Math.random() * yananlar.length)]);
}

function hepsiSondu() {
  mikrofonuKapat();
  mumDurum.textContent = '🎉 İyi ki doğdun! Dileğini tuttun mu?';
  mumIpucu.hidden = true;
  tekrarYakBtn.hidden = false;
  konfetiPatlat(220);
  melodiCal();
}

function mumlariYak() {
  mumlarEl.querySelectorAll('.mum').forEach((m) => m.classList.remove('sondu'));
  mumDurum.textContent = 'Mikrofona doğru üfle! 🌬️';
  mumIpucu.textContent = IPUCU_METNI;
  mumIpucu.hidden = false;
  tekrarYakBtn.hidden = true;
}

function mumEkraniniAc() {
  melodiDurdur(); // hoparlörden gelen müzik mumları söndürmesin
  mumlariYak();
  mikrofonuAc();
}

tekrarYakBtn.addEventListener('click', () => {
  melodiDurdur();
  mumlariYak();
  mikrofonuAc();
});

// --- Mikrofonla üfleme algılama ---
let mik = null; // { akis, kaynak, analiz, sessiz, veri }
let mikRaf = null;
let mikIstekNo = 0;
let mikTaban = 0;
let mikBaslangic = 0;
let ustUste = 0;
let sonSondurme = 0;

async function mikrofonuAc() {
  mikrofonuKapat();
  const istek = mikIstekNo;

  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
    mumIpucu.textContent = 'Bu tarayıcıda mikrofon açılamıyor. Mumlara dokunarak söndür 👆';
    return;
  }
  try {
    const akis = await navigator.mediaDevices.getUserMedia({
      audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false },
    });
    // Bu arada ekrandan çıkıldıysa ya da mumlar elle söndürüldüyse mikrofonu bırak
    if (istek !== mikIstekNo) {
      akis.getTracks().forEach((t) => t.stop());
      return;
    }
    const ctx = sesiHazirla();
    if (!ctx) throw new Error('Ses desteklenmiyor');
    await ctx.resume();

    const kaynak = ctx.createMediaStreamSource(akis);
    const analiz = ctx.createAnalyser();
    analiz.fftSize = 1024;
    // Bazı tarayıcılar çıkışa bağlı olmayan düğümleri çalıştırmıyor; sessiz bir çıkışa bağlıyoruz
    const sessiz = ctx.createGain();
    sessiz.gain.value = 0;
    kaynak.connect(analiz);
    analiz.connect(sessiz).connect(ctx.destination);

    mik = { akis, kaynak, analiz, sessiz, veri: new Float32Array(analiz.fftSize) };
    mikTaban = 0;
    mikBaslangic = performance.now();
    ustUste = 0;
    mikRaf = requestAnimationFrame(dinle);
  } catch (err) {
    if (istek !== mikIstekNo) return;
    mumIpucu.textContent = 'Mikrofon açılamadı. Mumlara dokunarak söndürebilirsin 👆';
  }
}

function dinle() {
  if (!mik) return;
  mik.analiz.getFloatTimeDomainData(mik.veri);
  let toplam = 0;
  for (let i = 0; i < mik.veri.length; i++) toplam += mik.veri[i] * mik.veri[i];
  const ses = Math.sqrt(toplam / mik.veri.length);
  const simdi = performance.now();

  // İlk 0.7 saniye ortamın gürültüsünü ölç
  if (simdi - mikBaslangic < 700) {
    mikTaban = Math.max(mikTaban, ses);
    mikRaf = requestAnimationFrame(dinle);
    return;
  }

  const esik = Math.min(0.3, Math.max(0.08, mikTaban * 3));
  nefesEl.style.width = `${Math.min(100, (ses / esik) * 100)}%`;

  if (ses > esik) ustUste++;
  else ustUste = Math.max(0, ustUste - 1);

  // Üfleme birkaç kare sürerse her 180 ms'de bir mum söner
  if (ustUste >= 4 && simdi - sonSondurme > 180) {
    sonSondurme = simdi;
    rastgeleMumSondur();
  }
  if (mik) mikRaf = requestAnimationFrame(dinle);
}

function mikrofonuKapat() {
  mikIstekNo++;
  if (mikRaf) cancelAnimationFrame(mikRaf);
  mikRaf = null;
  if (mik) {
    mik.akis.getTracks().forEach((t) => t.stop());
    mik.kaynak.disconnect();
    mik.sessiz.disconnect();
    mik = null;
  }
  nefesEl.style.width = '0%';
}
