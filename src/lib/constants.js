export const SYSTEM_ROLES = {
  ADMIN: "ADMIN",
  KOORDINATOR_POSKO: "KOORDINATOR_POSKO",
  PETUGAS: "PETUGAS",
};

export const OFFICER_TYPES = {
  PETUGAS_POSKO: "PETUGAS_POSKO",
  PETUGAS_ASSESSMENT: "PETUGAS_ASSESSMENT",
  PETUGAS_AMBULANCE: "PETUGAS_AMBULANCE",
};

export const USER_STATUS = {
  PENDING: "PENDING",
  ACTIVE: "ACTIVE",
  REJECTED: "REJECTED",
};

export const SHIFT_TYPES = {
  SIANG: "SIANG",
  MALAM: "MALAM",
};

export const INCIDENT_STATUS = {
  REPORTED: "REPORTED",
  ON_PROCESS: "ON_PROCESS",
  HANDLED: "HANDLED",
  CLOSED: "CLOSED",
};

export const AMBULANCE_REQUEST_STATUS = {
  MENUNGGU: "MENUNGGU",
  DALAM_PERJALANAN: "DALAM_PERJALANAN",
  PASIEN_DIANGKUT: "PASIEN_DIANGKUT",
  SELESAI: "SELESAI",
};

export const AMBULANCE_CREW_ROLES = {
  DRIVER: "DRIVER",
  PARAMEDIK: "PARAMEDIK",
};

export const REPORT_APPROVAL_STATUS = {
  PENDING: "PENDING",
  APPROVED: "APPROVED",
  REJECTED: "REJECTED",
};

export const POSKO_REPORT_TYPES = {
  HARIAN: "HARIAN",
  SITUASI: "SITUASI",
};

export const POSKO_REPORT_STATUSES = {
  DRAFT: "DRAFT",
  SUBMITTED: "SUBMITTED",
};

export const MEDICAL_EVENT_STATUS = {
  INITIATED: "INITIATED",
  PREPARATION: "PREPARATION",
  READY: "READY",
  ONGOING: "ONGOING",
  COMPLETED: "COMPLETED",
  CLOSED: "CLOSED",
};

export const MEDICAL_EVENT_TYPES = {
  LARI: "LARI",
  SEPEDA: "SEPEDA",
  DRAG_RACE: "DRAG_RACE",
  ROADRACE: "ROADRACE",
  KONSER: "KONSER",
  LAINNYA: "LAINNYA",
};

export const MEDICAL_RUNNING_CATEGORIES = {
  FIVE_K: "5K",
  TEN_K: "10K",
  HALF_MARATHON: "HM",
  FULL_MARATHON: "FM",
};

export const MEDICAL_EVENT_POST_TYPES = {
  WATER_STATION: "WATER_STATION",
  MEDICAL_TENT: "MEDICAL_TENT",
  MOBILE_POINT: "MOBILE_POINT",
};

export const MEDICAL_STAFF_ROLES = {
  DOKTER: "DOKTER",
  PARAMEDIS: "PARAMEDIS",
  PERAWAT: "PERAWAT",
};

export const MEDICAL_DUTY_MODES = {
  STATIS: "STATIS",
  DINAMIS: "DINAMIS",
};

export const MEDICAL_FLEET_TYPES = {
  AMBULANCE: "AMBULANCE",
  MOTOR: "MOTOR",
};

export const AMBULANCE_UNIT_STATUS = {
  STANDBY: "STANDBY",
  BERTUGAS: "BERTUGAS",
  MAINTENANCE: "MAINTENANCE",
};

export const MOTOR_UNIT_STATUS = {
  STANDBY: "STANDBY",
  BERTUGAS: "BERTUGAS",
  MAINTENANCE: "MAINTENANCE",
};

export const TRIAGE_LEVELS = {
  HIJAU: "HIJAU",
  KUNING: "KUNING",
  MERAH: "MERAH",
  HITAM: "HITAM",
};

export const AVPU_RESPON_OPTIONS = ["Awas", "Suara", "Nyeri", "Tidak Respon"];

export const MEDICAL_EVENT_CHIEF_COMPLAINT_OPTIONS = [
  "Nyeri dada",
  "Sesak napas",
  "Pusing",
  "Mual muntah",
  "Kram otot",
  "Kelelahan ekstrem",
  "Sinkop/pingsan",
  "Luka lecet",
  "Perdarahan",
  "Trauma jatuh",
  "Dehidrasi",
  "Hipotermia",
  "Hiperglikemia/hipoglikemia",
  "Butuh observasi lanjutan",
  "Perlu evakuasi cepat",
];

export const MEDICAL_EVENT_QUICK_ACTION_OPTIONS = [
  "Observasi singkat",
  "Balut luka",
  "Pembersihan luka",
  "Kompres dingin",
  "Posisi recovery",
  "Oksigen",
  "Immobilisasi",
  "Infus",
  "Rujuk ke RS",
  "Edukasi pulang",
];

export const LOGISTIC_MOVEMENT_TYPES = {
  MASUK: "MASUK",
  KELUAR: "KELUAR",
};

export const EMERGENCY_AGENCIES = [
  "PMI",
  "BPBD",
  "Damkar",
  "Polri",
  "TNI",
  "Dinkes",
  "RS Rujukan",
  "Lainnya",
];

export const SPECIALIZATIONS = {
  DOKTER: "DOKTER",
  PERAWAT: "PERAWAT",
  PARAMEDIK: "PARAMEDIK",
  LOGISTIK: "LOGISTIK",
  DRIVER_AMBULANCE: "DRIVER_AMBULANCE",
  PUSDATIN: "PUSDATIN",
};

export const TANGSEL_WILAYAH = {
  CIPUTAT: [
    "Cipayung",
    "Cipayung Jaya",
    "Jombang",
    "Sawah Baru",
    "Sawah Lama",
    "Serua",
    "Serua Indah",
  ],
  "CIPUTAT TIMUR": [
    "Cempaka Putih",
    "Cireundeu",
    "Pondok Ranji",
    "Rempoa",
    "Rengas",
    "Pisangan",
  ],
  PAMULANG: [
    "Bambu Apus",
    "Benda Baru",
    "Kedaung",
    "Pamulang Barat",
    "Pamulang Timur",
    "Pondok Benda",
  ],
  "PONDOK AREN": [
    "Jurang Mangu Barat",
    "Jurang Mangu Timur",
    "Pondok Aren",
    "Pondok Betung",
    "Pondok Jaya",
    "Pondok Kacang Barat",
    "Pondok Kacang Timur",
    "Perigi",
    "Perigi Baru",
    "Pondok Pucung",
    "Parigi Lama",
  ],
  SERPONG: [
    "Buaran",
    "Ciater",
    "Cilenggang",
    "Lengkong Gudang",
    "Lengkong Gudang Timur",
    "Lengkong Wetan",
    "Rawa Buntu",
    "Serpong",
  ],
  "SERPONG UTARA": [
    "Jelupang",
    "Lengkong Karya",
    "Pakulonan",
    "Pakualam",
    "Pakujaya",
    "Pondok Jagung",
    "Pondok Jagung Timur",
  ],
  SETU: [
    "Babakan",
    "Bakti Jaya",
    "Kademangan",
    "Keranggan",
    "Muncul",
    "Setu",
  ],
};

export const TANGSEL_KECAMATAN_OPTIONS = Object.keys(TANGSEL_WILAYAH);
