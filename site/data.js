/*
  ───────────────────────────────────────────────
  data.js — 홈페이지에 들어가는 모든 내용은 여기서만 수정하면 됩니다.
  이미지 경로는 index.html 기준 상대경로(예: "images/icon-gallery.png")
  또는 전체 URL(https://...)을 쓰면 됩니다. 비워두면("") 회색 기본값이 보입니다.
  ───────────────────────────────────────────────
*/
window.SITE_DATA = {

  /* 사이트 기본 정보 (왼쪽 위 홈 메뉴 > 프로필) */
  profile: {
    siteTitle: "My Desktop",
    name: "닉네임",
    bio: "한 줄 소개를 적어주세요.",
    avatar: "",
    links: [
      { label: "X (Twitter)", url: "https://x.com/" }
    ]
  },

  /* 아이콘: 바탕화면과 하단 Dock에 똑같이 쓰입니다.
     icon 에 이미지를 넣으면 회색 기본 아이콘 대신 그 이미지가 표시됩니다.
     순서를 바꾸면 바탕화면/Dock 순서도 같이 바뀝니다. id 는 바꾸지 마세요. */
  apps: [
    { id: "gallery",  name: "갤러리",    icon: "" },
    { id: "calendar", name: "캘린더",    icon: "" },
    { id: "music",    name: "노래",      icon: "" },
    { id: "trpg",     name: "TRPG 백업", icon: "" },
    { id: "story",    name: "썰 백업",   icon: "" }
  ],

  /* 배경화면
     color    : 기본 배경색(그라데이션). 이미지가 없거나 불러오는 동안 보입니다. 방문자는 바꿀 수 없습니다.
     images   : 방문자가 고를 수 있는 배경 이미지 목록
     mode     : 처음 방문했을 때 "slideshow"(이미지 순서대로 전환) 또는 "image"(첫 번째 이미지 고정)
     interval : 슬라이드쇼에서 다음 이미지로 넘어가는 간격(초)
     fade     : 페이드 전환에 걸리는 시간(초)
     방문자는 슬라이드쇼를 켜고 끄거나, 등록된 이미지 중 하나를 고르는 것만 할 수 있습니다. */
  background: {
    color: "linear-gradient(160deg,#f6a878 0%,#e86a7e 35%,#7a5fc9 70%,#2c3e8f 100%)",
    images: [
      /* { name: "배경 1", src: "images/wall1.jpg" }, */
    ],
    mode: "slideshow",
    interval: 10,
    fade: 2
  },

  /* 바탕화면 왼쪽 위젯. 적힌 순서대로 표시되며, 줄을 지우면 그 위젯이 사라집니다.
     type 은 "photo"(그림) 또는 "calendar"(캘린더) 이고, 종류마다 하나씩만 쓸 수 있습니다.
     photo 의 src 를 비워두면 회색으로 보이고, 누르면 open 에 적은 앱이 열립니다. */
  widgets: [
    { type: "photo", src: "", caption: "", open: "gallery" },
    { type: "calendar", open: "calendar", glass: false }
  ],

  /* 하단 메뉴바(Dock). enabled: false 면 메뉴바를 쓰지 않고, pinned: true 면 항상 화면에 고정됩니다. */
  dock: { enabled: true, pinned: false },

  /* 캘린더 앱과 캘린더 위젯의 강조색 (오늘 날짜 표시 등) */
  calendarAccent: "#ff3b30",

  /* 갤러리: src 비워두면 회색 칸으로 보입니다 */
  gallery: [
    { src: "", title: "그림 1", desc: "설명을 적어주세요", date: "2026-11-01" },
    { src: "", title: "그림 2", desc: "", date: "2026-11-05" },
    { src: "", title: "그림 3", desc: "", date: "2026-11-12" },
    { src: "", title: "그림 4", desc: "", date: "2026-11-20" },
    { src: "", title: "그림 5", desc: "", date: "2026-11-24" },
    { src: "", title: "그림 6", desc: "", date: "2026-11-26" }
  ],

  /* 캘린더 일정: date 는 YYYY-MM-DD, color 는 선택 */
  calendar: [
    { date: "2026-11-26", title: "홈페이지 오픈", color: "#ff5f57" },
    { date: "2026-12-03", title: "TRPG 세션", color: "#5b8cff", time: "20:00" },
    { date: "2026-12-24", title: "크리스마스 이브", color: "#28c840" }
  ],

  /* 플레이리스트: src 에 mp3 경로나 URL, 또는 유튜브 링크를 넣을 수 있습니다 */
  playlist: [
    { title: "노래 제목 1", artist: "아티스트", cover: "", src: "" },
    { title: "노래 제목 2", artist: "아티스트", cover: "", src: "" },
    { title: "유튜브 예시", artist: "YouTube", cover: "", src: "https://www.youtube.com/watch?v=jfKfPfyJRdk" }
  ],

  /* TRPG 백업
     log: 세션 로그 HTML 파일 경로. 이미지처럼 파일을 올리고 경로만 적으면 됩니다.
          Roll20 "Chat Archive" 페이지를 [Show on One Page] 누른 뒤 저장한 파일을 그대로 쓰면 되고,
          대화 부분만 자동으로 꺼내서 보여줍니다 (잘라낼 필요 없음).
          파일 이름은 영어로 짧게 바꾸는 것을 추천합니다. 예) logs/spring.html
     프로필 사진: 저장할 때 같이 생긴 "_files" 폴더도 함께 올리세요.
          HTML 이름을 바꿨다면 폴더도 똑같이 맞춰주세요. 예) logs/spring.html + logs/spring_files/
          폴더를 다른 곳에 두었다면 logAssets 에 그 폴더 경로를 적습니다. 예) logAssets: "images/spring"
     content 는 로그 위에 보이는 요약입니다. 비워둬도 됩니다. */
  trpg: [
    {
      title: "첫 번째 세션",
      system: "CoC 7판",
      date: "2026-11-15",
      gm: "KP 닉네임",
      players: ["PC1", "PC2"],
      tags: ["호러", "타이만"],
      cover: "",
      link: "",
      log: "",
      logAssets: "",
      content: "세션 요약이나 로그를 여기에 적습니다.\n줄바꿈은 \\n 으로 넣으면 됩니다."
    },
    {
      title: "두 번째 세션",
      system: "인세인",
      date: "2026-11-22",
      gm: "GM 닉네임",
      players: ["PC1", "PC2", "PC3"],
      tags: ["캠페인"],
      cover: "",
      link: "",
      content: "내용"
    }
  ],

  /* 썰 백업 */
  story: [
    {
      title: "썰 제목",
      date: "2026-11-20",
      tags: ["일상", "단편"],
      cover: "",
      link: "",
      content: "썰 내용을 여기에 적습니다.\n\n문단은 빈 줄로 나눕니다."
    }
  ]
};
