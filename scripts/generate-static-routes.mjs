import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { loadEnv } from 'vite'

const routes = {
  '/': ['파일정비소 - 안전한 이미지·PDF 도구', '이미지 압축, HEIC JPG 변환, PDF 합치기와 나누기를 설치 없이 내 브라우저에서 처리하세요.'],
  '/image-compress': ['이미지 용량 줄이기 - 파일정비소', 'JPG, PNG, WEBP 이미지 용량을 브라우저에서 안전하게 줄이세요.'],
  '/image-convert': ['이미지 형식 변환 - 파일정비소', 'JPG, PNG, WEBP 이미지를 원하는 형식으로 일괄 변환하세요.'],
  '/heic-to-jpg': ['HEIC JPG 변환 - 파일정비소', '아이폰 HEIC 사진을 설치 없이 JPG로 변환하세요.'],
  '/images-to-pdf': ['사진 PDF 변환 - 파일정비소', '여러 장의 사진을 하나의 PDF 문서로 변환하세요.'],
  '/pdf-merge': ['PDF 합치기 - 파일정비소', '여러 PDF 파일을 원하는 순서대로 하나의 문서로 합치세요.'],
  '/pdf-split': ['PDF 나누기 - 파일정비소', 'PDF에서 필요한 페이지 구간만 추출해 새 문서로 저장하세요.'],
  '/pdf-rotate': ['PDF 회전 - 파일정비소', 'PDF의 모든 페이지를 90도, 180도 또는 270도 회전하세요.'],
  '/pdf-to-jpg': ['PDF JPG 변환 - 파일정비소', 'PDF의 각 페이지를 고화질 JPG 이미지로 변환하세요.'],
  '/pdf-page-numbers': ['PDF 페이지 번호 - 파일정비소', 'PDF 문서 위쪽 또는 아래쪽에 페이지 번호를 추가하세요.'],
  '/hwp-to-pdf': ['HWP HWPX 호환 PDF 변환 - 파일정비소', 'HWP와 HWPX의 일반 본문과 표를 서버 업로드 없이 이미지형 호환 PDF로 만드세요.'],
  '/guides': ['파일 작업 가이드 - 파일정비소', '이미지와 PDF를 안전하게 변환하고 제출하기 위한 형식 선택, 품질 확인과 실무 체크리스트를 살펴보세요.'],
  '/guides/image-file-size': ['이미지 용량 줄이기: 화질과 파일 크기를 함께 지키는 방법 - 파일정비소', 'JPG·PNG·WEBP 이미지 용량이 커지는 이유와 제출용, 웹용, 메신저용으로 알맞게 줄이는 기준을 설명합니다.'],
  '/guides/image-format': ['JPG·PNG·WEBP 차이와 이미지 형식 선택 기준 - 파일정비소', '사진, 투명 배경, 문서 캡처, 웹 게시물에 맞춰 JPG·PNG·WEBP 중 어떤 형식을 선택해야 하는지 비교합니다.'],
  '/guides/heic-to-jpg': ['아이폰 HEIC 사진이 안 열릴 때 JPG로 바꾸는 방법 - 파일정비소', 'HEIC 파일이 윈도우나 제출 사이트에서 열리지 않는 이유, JPG 변환 시 주의할 점과 재발 방지 설정을 안내합니다.'],
  '/guides/images-to-pdf': ['여러 장의 사진을 한 개 PDF로 만드는 순서와 주의사항 - 파일정비소', '영수증, 과제, 증빙사진을 원하는 순서로 정리해 하나의 PDF로 만들 때 확인해야 할 크기와 방향을 설명합니다.'],
  '/guides/pdf-merge': ['PDF 합치기 전에 확인해야 할 페이지 순서와 보안 - 파일정비소', '여러 PDF를 한 파일로 합칠 때 순서를 실수하지 않는 방법, 암호 문서와 개인정보 문서의 주의사항을 설명합니다.'],
  '/guides/pdf-split': ['PDF에서 필요한 페이지만 안전하게 추출하는 방법 - 파일정비소', '긴 PDF에서 특정 페이지 구간을 새 파일로 만들 때 페이지 번호를 정확히 확인하고 개인정보 노출을 줄이는 방법을 안내합니다.'],
  '/guides/pdf-rotate': ['거꾸로 된 PDF 페이지 방향을 바로잡는 방법 - 파일정비소', '스캔 PDF가 옆으로 눕거나 뒤집혔을 때 90도·180도·270도 회전 값을 고르는 기준과 저장 후 확인사항을 설명합니다.'],
  '/guides/pdf-to-jpg': ['PDF를 JPG로 바꿀 때 해상도와 페이지 수 정하기 - 파일정비소', 'PDF 페이지를 이미지로 저장해야 하는 상황과 글자가 흐려지지 않도록 해상도를 선택하는 기준을 설명합니다.'],
  '/guides/pdf-page-numbers': ['PDF 페이지 번호를 넣기 전 알아둘 표지와 시작 번호 - 파일정비소', '보고서와 제출 문서에 페이지 번호를 넣을 때 위치, 표지 포함 여부, 기존 번호 중복을 확인하는 방법을 안내합니다.'],
  '/guides/hwp-to-pdf': ['HWP·HWPX를 PDF로 바꿀 때 표와 글꼴이 달라지는 이유 - 파일정비소', '한글 문서를 PDF로 변환할 때 표, 글꼴, 이미지, 페이지 배치가 달라지는 원인과 정확도가 필요할 때 사용할 방법을 설명합니다.'],
  '/about': ['서비스 소개 - 파일정비소', '파일정비소가 제공하는 브라우저 기반 이미지·PDF·HWPX 도구와 운영 원칙을 소개합니다.'],
  '/support': ['지원 범위와 제한 - 파일정비소', '파일정비소의 지원 형식, 변환 방식과 HWP 호환 범위를 확인하세요.'],
  '/privacy': ['개인정보처리방침 - 파일정비소', '파일정비소의 로컬 파일 처리 방식과 개인정보 보호 원칙을 확인하세요.'],
  '/terms': ['이용약관 - 파일정비소', '파일정비소 도구 사용 조건과 서비스 제한을 확인하세요.'],
  '/legal': ['법적 고지 - 파일정비소', '파일정비소에 적용되는 개인정보 보호법, 저작권법 및 향후 유료화 시 준비할 법적 사항을 확인하세요.'],
  '/contact': ['문의하기 - 파일정비소', '파일정비소 기능 오류, 문서 호환성 및 보안 문제 문의 방법을 확인하세요.'],
}

const staticContent = {
  '/': {
    label: '파일정비소 소개',
    heading: '설치 없이 사용하는 한국형 파일 작업 도구',
    intro: '파일정비소는 이미지와 PDF를 빠르게 정리해야 하는 사람을 위해 만든 브라우저 기반 도구 모음입니다. 회원가입 없이 파일을 선택하고, 결과를 확인한 뒤 필요한 형식으로 내려받을 수 있습니다.',
    sections: [
      { heading: '파일을 서버에 올리지 않고 처리하는 이유', paragraphs: ['현재 제공하는 변환은 가능한 범위에서 사용 중인 브라우저 안에서 처리됩니다. 원본 파일을 운영 서버에 보관하지 않기 때문에 문서 작업을 시작하기 전에 업로드 대상과 결과를 직접 확인할 수 있습니다.', '브라우저 처리 방식은 개인정보 보호에 도움이 되지만 기기의 메모리와 브라우저 성능의 영향을 받습니다. 큰 파일이나 복잡한 문서는 변환 시간이 길어질 수 있으며, 중요한 문서는 결과를 열어 확인한 뒤 제출해야 합니다.'] },
      { heading: '실무에서 자주 쓰는 작업을 한곳에서', paragraphs: ['사진을 PDF로 묶거나, PDF 페이지를 나누고 회전하거나, JPG·PNG·WEBP·HEIC 형식을 바꾸는 작업을 한 화면에서 찾을 수 있습니다. HWP·HWPX 변환은 원본 레이아웃을 완전히 복제하는 기능이 아니라 내용 확인을 위한 호환 변환이라는 점을 분명히 안내합니다.'] },
      { heading: '변환 전후에 꼭 확인할 것', paragraphs: ['결과 파일을 다운로드하기 전에 페이지 수, 표와 이미지, 글꼴, 방향, 파일명과 용량을 확인하세요. 제출 기관이 정한 파일 형식과 용량 기준이 있다면 그 기준을 우선해야 하며, 원본은 결과 검수가 끝날 때까지 보관하는 것이 안전합니다.'] },
    ],
  },
  '/image-compress': {
    label: '이미지 도구 안내', heading: '이미지 용량을 줄일 때 화질과 용도를 함께 확인하세요',
    intro: '이미지 용량 줄이기는 이메일, 온라인 제출, 블로그와 메신저에 맞게 파일 크기를 낮추는 도구입니다. 원본은 바꾸지 않고 새 결과 파일을 만들어 내려받습니다.',
    sections: [
      { heading: '어떤 이미지에 적합한가요?', paragraphs: ['JPG·PNG·WEBP 이미지를 선택해 웹 게시나 첨부에 적합한 크기로 줄일 수 있습니다. 사진처럼 색상이 많은 이미지는 JPG가 작아지는 경우가 많고, 투명 배경이나 선명한 도형은 PNG가 더 적합할 수 있습니다.'] },
      { heading: '압축 후 검수 방법', paragraphs: ['파일 크기만 줄었다고 작업이 끝난 것은 아닙니다. 작은 글자와 얼굴, 선명한 선을 확대해 확인하고 원본과 결과를 비교하세요. 이미 여러 번 압축된 이미지는 더 줄어들지 않거나 세부 정보가 손실될 수 있습니다.'] },
      { heading: '지원 범위와 제한', paragraphs: ['애니메이션, 일부 색상 프로필과 촬영 정보는 변환 과정에서 유지되지 않을 수 있습니다. 원본 파일을 삭제하지 말고, 제출 목적이라면 해당 사이트의 최대 용량과 허용 확장자를 먼저 확인하세요.'] },
    ],
  },
  '/image-convert': {
    label: '이미지 도구 안내', heading: 'JPG·PNG·WEBP 형식을 목적에 맞게 바꾸세요',
    intro: '이미지 형식 변환은 열리지 않는 사진이나 제출 형식이 맞지 않는 이미지를 새 파일로 만드는 도구입니다. 확장자 이름만 바꾸는 것이 아니라 선택한 형식으로 다시 인코딩합니다.',
    sections: [
      { heading: '형식별로 무엇이 다른가요?', paragraphs: ['JPG는 사진과 호환성이 중요할 때 적합하고, PNG는 투명 배경과 선명한 그래픽에 유리합니다. WEBP는 웹에서 작은 파일을 제공할 때 유용하지만 일부 오래된 프로그램이나 제출 사이트에서는 지원하지 않을 수 있습니다.'] },
      { heading: '투명 배경과 애니메이션 확인', paragraphs: ['JPG는 투명 배경을 저장하지 못하므로 배경이 채워질 수 있습니다. 애니메이션 이미지와 일부 메타데이터는 결과에 포함되지 않을 수 있으니 변환 후 실제 사용 환경에서 열어 보세요.'] },
      { heading: '안전한 작업 순서', paragraphs: ['원본을 먼저 보관하고 필요한 장수만 선택한 뒤 결과 파일명과 확장자를 확인하세요. 여러 장을 변환했다면 결과 개수와 각 파일의 방향이 원본과 같은지도 확인하는 것이 좋습니다.'] },
    ],
  },
  '/heic-to-jpg': {
    label: '아이폰 사진 안내', heading: 'HEIC 사진을 호환성 높은 JPG로 바꾸는 방법',
    intro: '아이폰에서 촬영한 HEIC·HEIF 사진은 저장 공간을 아끼지만 윈도우 프로그램이나 일부 제출 사이트에서 열리지 않을 수 있습니다. 파일정비소는 선택한 사진의 새 JPG 사본을 만듭니다.',
    sections: [
      { heading: 'HEIC가 열리지 않는 이유', paragraphs: ['HEIC는 최신 압축 기술을 사용하지만 모든 운영체제와 웹서비스가 같은 코덱을 제공하지는 않습니다. 제출처가 JPG만 받거나 상대방 기기에서 미리보기가 되지 않는다면 JPG 사본을 만드는 방법이 간단합니다.'] },
      { heading: '변환 후 확인할 항목', paragraphs: ['사진 방향, 촬영일 표시, 색상, 인물의 작은 글자를 확인하세요. 라이브 포토의 동영상 부분은 일반 JPG로 변환되지 않으며 일부 촬영 정보와 색상 프로필이 달라질 수 있습니다.'] },
      { heading: '원본 보관과 재발 방지', paragraphs: ['변환 결과가 정상적으로 열리는지 확인하기 전에는 HEIC 원본을 삭제하지 마세요. 아이폰 카메라 설정에서 호환성 우선을 선택하면 이후 촬영분을 JPG 중심으로 저장할 수 있지만 저장 공간과 화질 차이를 함께 고려해야 합니다.'] },
    ],
  },
  '/images-to-pdf': {
    label: '이미지·PDF 안내', heading: '여러 사진을 한 개 PDF로 정리하기',
    intro: '영수증, 과제, 증빙사진과 스캔 이미지를 한 파일로 제출해야 할 때 사진을 원하는 순서의 PDF로 묶을 수 있습니다. 결과는 새 문서로 만들어지며 원본 사진은 수정하지 않습니다.',
    sections: [
      { heading: '페이지 순서와 방향', paragraphs: ['화면 목록의 순서가 PDF 페이지 순서가 됩니다. 가로·세로 사진이 섞여 있으면 페이지마다 여백이 다르게 보일 수 있으므로 목록에서 순서를 정하고 결과 PDF를 처음부터 끝까지 확인하세요.'] },
      { heading: '용량과 선명도의 균형', paragraphs: ['원본 사진이 많거나 해상도가 높으면 PDF 용량이 커집니다. 제출처의 용량 제한을 확인하고 필요하다면 먼저 이미지 용량을 줄인 뒤 PDF로 묶으세요. 작은 글자가 있는 영수증은 압축 후 확대해 읽을 수 있는지 확인해야 합니다.'] },
      { heading: '검색 가능한 PDF가 필요한 경우', paragraphs: ['사진을 PDF로 묶는 기능은 이미지를 페이지에 배치하는 방식이며 OCR로 텍스트를 추출하지 않습니다. 글자 검색이나 복사가 필요하면 OCR 기능이 있는 별도 프로그램을 사용하세요.'] },
    ],
  },
  '/pdf-merge': {
    label: 'PDF 편집 안내', heading: '여러 PDF를 제출 순서대로 하나로 합치기',
    intro: '지원서와 첨부자료, 여러 보고서를 한 파일로 제출해야 할 때 PDF 합치기를 사용할 수 있습니다. 파일 목록의 순서를 기준으로 새 PDF를 만들고 원본은 그대로 둡니다.',
    sections: [
      { heading: '합치기 전 순서 정하기', paragraphs: ['본문, 증빙자료, 첨부서류 순서처럼 제출 기준을 먼저 정하세요. 파일명 앞에 01, 02 같은 번호를 붙이면 목록을 정리하기 쉽고, 합친 뒤 첫 페이지·중간 페이지·마지막 페이지를 다시 확인할 수 있습니다.'] },
      { heading: '암호·전자서명 문서 주의', paragraphs: ['열기 암호가 있거나 DRM이 적용된 PDF, 특수 양식과 전자서명은 처리되지 않거나 결과에서 기능이 달라질 수 있습니다. 제출용 서명 문서는 원본 프로그램에서 합치는 방법이 더 안전할 수 있습니다.'] },
      { heading: '개인정보 문서의 처리', paragraphs: ['합치기 전에 필요 없는 주민등록번호, 주소, 연락처 페이지가 포함되지 않았는지 확인하세요. 민감한 파일은 공용 PC에서 작업하지 말고 결과 파일을 내려받은 뒤 브라우저의 다운로드 목록과 공유 폴더를 확인하세요.'] },
    ],
  },
  '/pdf-split': {
    label: 'PDF 편집 안내', heading: 'PDF에서 필요한 페이지만 안전하게 추출하기',
    intro: '긴 안내서나 스캔 문서에서 제출할 페이지 구간만 새 PDF로 만들 때 사용합니다. 원본을 삭제하지 않고 선택한 구간으로 별도 파일을 생성합니다.',
    sections: [
      { heading: '페이지 번호를 정확히 확인하세요', paragraphs: ['PDF 뷰어에 표시되는 실제 페이지 순서와 문서 안에 인쇄된 쪽 번호가 다를 수 있습니다. 첫 장부터 세는 PDF 순서를 기준으로 범위를 입력하고, 결과의 첫 장과 마지막 장을 확인하세요.'] },
      { heading: '개인정보 노출 줄이기', paragraphs: ['필요 없는 부록과 개인정보가 있는 페이지를 제외하면 공유 범위를 줄일 수 있습니다. 다만 페이지를 나눈다고 문서 속 메타데이터나 숨은 첨부파일이 자동으로 삭제되는 것은 아니므로 별도 보안 점검이 필요합니다.'] },
      { heading: '암호화 문서와 원본', paragraphs: ['암호화된 PDF는 처리되지 않을 수 있습니다. 결과를 확인하기 전에는 원본을 보관하고, 파일명에 포함된 개인정보와 공유 권한도 함께 확인하세요.'] },
    ],
  },
  '/pdf-rotate': {
    label: 'PDF 편집 안내', heading: '옆으로 눕거나 뒤집힌 PDF 페이지 바로잡기',
    intro: '스캔 문서와 휴대폰 촬영 자료처럼 방향이 뒤집힌 PDF를 90도, 180도 또는 270도 회전해 새 파일로 저장합니다.',
    sections: [
      { heading: '회전 각도 선택', paragraphs: ['90도는 시계 방향으로 한 번, 270도는 반대 방향으로 한 번 돌리는 방식입니다. 첫 페이지뿐 아니라 중간과 마지막 페이지도 같은 방향이어야 하는지 확인한 뒤 전체 회전을 선택하세요.'] },
      { heading: '일부 페이지만 방향이 다른 경우', paragraphs: ['현재 전체 페이지에 같은 각도를 적용하는 작업이라면 먼저 PDF를 필요한 구간으로 나누고, 각 구간을 따로 회전한 뒤 다시 합치는 방법을 사용할 수 있습니다.'] },
      { heading: '전자서명과 양식 확인', paragraphs: ['회전 후에도 전자서명, 입력 양식, 머리글과 바닥글이 의도한 위치에 있는지 결과 파일을 확인하세요. 원본은 결과 검수가 끝날 때까지 보관하는 것이 좋습니다.'] },
    ],
  },
  '/pdf-to-jpg': {
    label: 'PDF 변환 안내', heading: 'PDF를 JPG로 바꿀 때 해상도와 페이지 수 정하기',
    intro: 'PDF의 각 페이지를 이미지로 저장해 메신저, 게시물, 이미지 편집 프로그램에서 사용해야 할 때 JPG 변환을 이용할 수 있습니다.',
    sections: [
      { heading: 'JPG가 알맞은 경우와 아닌 경우', paragraphs: ['한 페이지를 이미지로 공유하거나 PDF 미리보기를 지원하지 않는 서비스에 올릴 때 JPG가 편리합니다. 검색 가능한 글자, 링크, 책갈피, 입력 양식이 필요하다면 PDF를 유지하세요.'] },
      { heading: '해상도와 용량', paragraphs: ['해상도가 높을수록 작은 글자가 선명해지지만 페이지마다 파일이 커집니다. 휴대폰 화면 공유와 인쇄 제출의 기준이 다르므로 목적에 맞는 해상도를 선택하고 결과를 확대해 확인하세요.'] },
      { heading: '여러 페이지 결과 관리', paragraphs: ['PDF 한 페이지마다 JPG 한 장이 만들어집니다. 변환 후 결과 개수와 파일명 순서를 확인하고, 여러 이미지를 다시 문서로 묶을 때는 페이지 순서가 유지되는지 확인하세요.'] },
    ],
  },
  '/pdf-page-numbers': {
    label: 'PDF 편집 안내', heading: '제출용 PDF에 페이지 번호를 넣는 기준',
    intro: '보고서와 제출 문서에 페이지 번호를 추가해 검토자가 필요한 부분을 찾기 쉽게 만들 수 있습니다. 번호 위치와 시작 페이지는 제출 기관의 지침을 우선하세요.',
    sections: [
      { heading: '표지 포함 여부', paragraphs: ['현재 도구는 PDF 첫 페이지부터 순서대로 번호를 추가합니다. 표지를 제외하고 본문부터 1로 시작해야 한다면 표지와 본문을 나눈 뒤 본문에 번호를 넣고 다시 합치는 방식이 필요합니다.'] },
      { heading: '기존 머리글·바닥글 확인', paragraphs: ['이미 번호가 인쇄된 문서에 새 번호를 추가하면 두 번호가 겹칠 수 있습니다. 번호가 본문, 각주, 도장과 겹치지 않는지 첫 페이지와 마지막 페이지를 확대해 확인하세요.'] },
      { heading: '제출 전 검수', paragraphs: ['페이지 번호가 모든 페이지에 표시되는지, 잘리지 않는지, 순서가 끊기지 않는지 확인하세요. 기관 양식이 있으면 위치·글꼴·시작 번호를 임의로 바꾸지 않는 것이 안전합니다.'] },
    ],
  },
  '/hwp-to-pdf': {
    label: '한글 문서 안내', heading: 'HWP·HWPX를 PDF로 바꿀 때 표와 글꼴이 달라지는 이유',
    intro: 'HWP와 HWPX는 글꼴, 쪽 설정, 표, 도형, 수식과 배치 정보를 함께 담는 문서 형식입니다. 브라우저 호환 변환은 내용 확인을 돕지만 원본과 같은 페이지 모양을 보장하지 않습니다.',
    sections: [
      { heading: '파일정비소 변환의 범위', paragraphs: ['일반 본문과 단순 표는 내용 확인용 이미지 PDF로 만들 수 있습니다. 병합 셀, 이미지, 도형, 수식, 차트, 머리글·바닥글과 특수 글꼴은 누락되거나 배치가 달라질 수 있으므로 변환 전후 비교가 필요합니다.'] },
      { heading: '정확한 제출본이 필요한 경우', paragraphs: ['시험지, 계약서, 공문, 이력서처럼 페이지 모양이 중요한 문서는 한컴오피스에서 직접 PDF로 저장하는 것이 가장 안전합니다. 파일정비소의 호환 PDF를 원본과 같은 결과라고 오해하지 않도록 변환 화면의 안내를 먼저 확인하세요.'] },
      { heading: '실무 검수 체크리스트', paragraphs: ['전체 페이지 수, 표의 행·열과 병합 셀, 이미지와 수식, 줄바꿈, 잘린 문장, 머리글·바닥글과 쪽 번호를 원본과 나란히 비교하세요. 문제가 있으면 브라우저 결과를 제출하지 말고 공식 저장 방식을 이용하세요.'] },
    ],
  },
  '/guides': {
    label: '파일 작업 가이드', heading: '파일 작업을 실수 없이 끝내는 방법',
    intro: '형식만 바꾸는 방법보다 결과를 확인하고 안전하게 제출하는 기준이 중요합니다. 파일정비소 가이드는 이미지, PDF와 한글 문서를 다룰 때 자주 생기는 문제를 실제 작업 순서에 맞춰 설명합니다.',
    sections: [
      { heading: '원본·지원 범위·결과를 먼저 확인하세요', paragraphs: ['결과를 확인하기 전까지 원본을 삭제하지 말고, 암호·용량·확장자 제한을 먼저 확인하세요. 변환이 성공했다는 메시지만으로 표와 이미지가 올바르게 보존되었다고 판단하면 안 됩니다.'] },
      { heading: '목적에 맞는 형식을 선택하세요', paragraphs: ['검색과 복사가 필요하면 텍스트 PDF를 유지하고, 호환성이 필요하면 JPG나 일반 PDF를 선택할 수 있습니다. 제출기관의 파일 규격과 용량이 가장 우선이며, 형식 변환으로 사라지는 기능도 함께 고려해야 합니다.'] },
      { heading: '개인정보가 있는 파일의 안전한 처리', paragraphs: ['필요 없는 페이지를 나누거나 제외하고, 공용 PC와 공개 링크를 피하세요. 파일정비소는 가능한 범위에서 브라우저 안에서 처리하지만, 사용 중인 기기와 다운로드 폴더의 보안도 함께 관리해야 합니다.'] },
    ],
  },
  '/about': {
    label: '서비스 소개', heading: '파일정비소는 반복적인 파일 작업을 줄이는 도구 모음입니다',
    intro: '파일정비소는 이미지, PDF와 한글 문서를 다룰 때 설치와 회원가입의 부담을 줄이기 위해 만든 한국어 서비스입니다. 어떤 기능이 정확히 지원되고 어떤 경우에 원본 프로그램이 필요한지 명확히 안내합니다.',
    sections: [
      { heading: '운영 원칙', paragraphs: ['변환 결과를 과장하지 않고 지원 범위와 제한을 먼저 안내합니다. 가능한 작업은 브라우저에서 처리하고, 민감한 문서는 사용자가 업로드 범위와 결과를 직접 확인할 수 있도록 설계합니다.'] },
      { heading: '지원하는 작업', paragraphs: ['이미지 용량 줄이기와 형식 변환, HEIC·JPG 변환, 사진 PDF 만들기, PDF 합치기·나누기·회전·페이지 번호와 HWP·HWPX 호환 PDF 변환을 제공합니다. 각 도구 페이지에서 세부 제한을 확인할 수 있습니다.'] },
      { heading: '정확도가 중요한 문서', paragraphs: ['계약서, 시험지, 공문과 이력서처럼 레이아웃이 중요한 파일은 원본 작성 프로그램에서 PDF로 저장하는 것을 권장합니다. 파일정비소는 내용을 확인하거나 간단한 반복 작업을 줄이는 용도로 사용하세요.'] },
    ],
  },
  '/support': {
    label: '지원 범위와 제한', heading: '지원되는 파일과 변환 결과를 미리 확인하세요',
    intro: '파일정비소는 브라우저에서 처리할 수 있는 작업을 중심으로 제공합니다. 파일 형식과 크기, 암호화 여부, 문서 구조에 따라 결과가 달라질 수 있으므로 아래 기준을 먼저 확인하세요.',
    sections: [
      { heading: '지원 형식', paragraphs: ['JPG·PNG·WEBP·HEIC 이미지와 일반 PDF, HWP·HWPX 호환 변환을 지원합니다. 도구별 최대 장수와 페이지 수는 각 도구 화면에 표시되며, 브라우저와 기기 성능에 따라 처리 가능한 파일 크기가 달라질 수 있습니다.'] },
      { heading: '지원하지 않을 수 있는 파일', paragraphs: ['암호화·DRM 문서, 손상된 파일, 특수 글꼴과 복잡한 도형·수식이 많은 HWP 문서는 처리되지 않거나 결과가 달라질 수 있습니다. 오류가 반복되면 원본 프로그램에서 직접 저장하는 방법을 사용하세요.'] },
      { heading: '문제 신고 방법', paragraphs: ['오류가 발생한 도구, 파일 형식, 브라우저와 오류 메시지를 문의 이메일로 알려주세요. 문서 내용이나 개인정보가 포함된 원본 파일은 보내지 말고, 문제가 재현되는 최소 정보만 전달하세요.'] },
    ],
  },
  '/privacy': {
    label: '개인정보처리방침', heading: '파일정비소의 개인정보와 파일 처리 원칙',
    intro: '파일정비소는 파일 변환 서비스 이용 중 처리되는 정보와 사용자가 확인해야 할 보안 사항을 공개합니다. 서비스 이용 전 본 방침과 각 도구의 안내를 함께 확인하세요.',
    sections: [
      { heading: '파일 처리', paragraphs: ['브라우저에서 처리되는 도구는 선택한 파일을 운영 서버로 전송하지 않습니다. 파일은 사용자의 기기 메모리와 브라우저 다운로드 영역에서 처리되며, 결과 파일은 사용자가 직접 저장합니다. 외부 서비스가 필요한 기능은 해당 화면에 별도로 안내합니다.'] },
      { heading: '접속·문의 정보', paragraphs: ['서비스 안정성과 오류 대응을 위해 최소한의 접속 정보가 처리될 수 있으며, 문의를 보내면 답변에 필요한 이메일과 문의 내용이 사용됩니다. 원본 문서와 주민등록번호 등 불필요한 민감정보는 문의에 첨부하지 마세요.'] },
      { heading: '광고와 외부 서비스', paragraphs: ['광고가 승인되면 광고 제공자의 쿠키와 측정 기술이 적용될 수 있습니다. 적용 시점과 선택 방법은 광고 및 쿠키 안내를 통해 고지하며, 정책 변경 시 이 페이지를 업데이트합니다.'] },
    ],
  },
  '/terms': {
    label: '이용약관', heading: '파일정비소 이용약관과 사용자 책임',
    intro: '파일정비소는 개인과 실무자의 반복적인 파일 작업을 돕는 무료 도구입니다. 서비스 사용 전에 지원 범위, 결과 검수와 금지된 이용을 확인하세요.',
    sections: [
      { heading: '서비스 이용', paragraphs: ['사용자는 본인이 합법적으로 처리할 권한이 있는 파일만 사용해야 합니다. 변환 결과가 원본과 동일하다고 보장되지 않는 도구는 제출 전에 직접 검수해야 하며, 기관의 파일 기준을 우선해야 합니다.'] },
      { heading: '금지된 이용', paragraphs: ['타인의 개인정보를 무단으로 처리하거나 저작권을 침해하는 파일을 사용하지 마세요. 서비스에 과도한 자동 요청을 보내거나 정상 이용을 방해하는 행위는 제한될 수 있습니다.'] },
      { heading: '서비스 변경과 문의', paragraphs: ['브라우저·라이브러리·보안 환경의 변경으로 일부 기능이 달라질 수 있습니다. 오류와 개선 제안은 문의 페이지의 이메일로 보내며, 중요한 제출물은 항상 원본 프로그램과 별도 검증을 권장합니다.'] },
    ],
  },
  '/legal': {
    label: '법적 고지', heading: '파일정비소의 법적 고지와 서비스 한계',
    intro: '파일정비소는 파일 변환 결과와 서비스 이용에 관한 일반적인 안내를 제공합니다. 법률·세무·의료 판단이 필요한 경우 전문기관의 조언을 우선하세요.',
    sections: [
      { heading: '변환 결과의 한계', paragraphs: ['파일 형식과 문서 구조에 따라 결과가 달라질 수 있습니다. 특히 HWP·HWPX 호환 변환은 원본 레이아웃을 보장하지 않으며, 제출·계약·시험과 같이 오류 비용이 큰 문서는 원본 프로그램에서 결과를 생성하고 검수해야 합니다.'] },
      { heading: '저작권과 개인정보', paragraphs: ['사용자는 처리할 파일의 권리와 개인정보 처리 권한을 갖고 있어야 합니다. 타인의 문서와 사진을 무단으로 변환하거나 결과를 공개하지 말고, 필요한 정보만 포함한 파일을 사용하세요.'] },
      { heading: '정책 변경', paragraphs: ['서비스 기능과 정책은 법령, 브라우저 환경과 운영 상황에 따라 변경될 수 있습니다. 변경사항은 사이트의 관련 안내 페이지에 반영하며, 문의는 7yvexon@gmail.com으로 접수합니다.'] },
    ],
  },
  '/contact': {
    label: '문의하기', heading: '파일정비소에 문제와 제안을 알려주세요',
    intro: '변환 오류, 지원 형식 문의, 접근성 문제와 서비스 개선 제안을 이메일로 받고 있습니다. 원본 문서 대신 오류가 발생한 도구와 재현 절차를 보내주시면 더 안전하고 빠르게 확인할 수 있습니다.',
    sections: [
      { heading: '문의에 포함하면 좋은 정보', paragraphs: ['사용한 도구 이름, 파일 확장자와 대략적인 크기, 브라우저와 운영체제, 발생한 오류 문구, 어떤 단계에서 문제가 생겼는지를 적어 주세요. 개인정보가 있는 파일은 첨부하지 마세요.'] },
      { heading: '보안·개인정보 문의', paragraphs: ['파일이 외부로 전송되는지, 개인정보 처리와 관련된 질문은 제목에 ‘개인정보 문의’라고 적어 주세요. 보안 취약점은 공개 채널에 상세한 공격 방법을 올리지 말고 이메일로 제보해 주세요.'] },
      { heading: '문의 이메일', paragraphs: ['일반 문의: 7yvexon@gmail.com. 답변에는 영업일 기준 시간이 걸릴 수 있으며, 긴급한 제출물은 원본 프로그램을 사용해 별도 확인하세요.'] },
    ],
  },
}

const guideAliases = {
  '/guides/image-file-size': '/image-compress',
  '/guides/image-format': '/image-convert',
  '/guides/heic-to-jpg': '/heic-to-jpg',
  '/guides/images-to-pdf': '/images-to-pdf',
  '/guides/pdf-merge': '/pdf-merge',
  '/guides/pdf-split': '/pdf-split',
  '/guides/pdf-rotate': '/pdf-rotate',
  '/guides/pdf-to-jpg': '/pdf-to-jpg',
  '/guides/pdf-page-numbers': '/pdf-page-numbers',
  '/guides/hwp-to-pdf': '/hwp-to-pdf',
}

for (const [guidePath, sourcePath] of Object.entries(guideAliases)) {
  staticContent[guidePath] = {
    ...staticContent[sourcePath],
    label: '파일 작업 가이드',
    heading: routes[guidePath][0],
    intro: routes[guidePath][1],
  }
}

const escapeHtml = (value) => value.replaceAll('&', '&amp;').replaceAll('"', '&quot;').replaceAll('<', '&lt;').replaceAll('>', '&gt;')
const renderStaticFallback = (route, title, description) => {
  const content = staticContent[route] || {
    label: '파일 작업 안내',
    heading: title,
    intro: description,
    sections: [{ heading: '사용 전 확인', paragraphs: ['파일 형식과 용량 제한을 먼저 확인하고, 변환이 끝난 뒤 결과 파일을 직접 열어 누락과 방향을 검사하세요.', '원본은 결과 검수가 끝날 때까지 보관하고, 제출 기관의 파일 기준을 우선하세요.'] }],
  }
  const sections = content.sections.map((section) => {
    const paragraphs = section.paragraphs.map((paragraph) => `<p>${escapeHtml(paragraph)}</p>`).join('')
    return `<section><h2>${escapeHtml(section.heading)}</h2>${paragraphs}</section>`
  }).join('')
  const links = route === '/' ? '<a href="/guides">파일 작업 가이드</a><a href="/about">서비스 소개</a><a href="/privacy">개인정보처리방침</a><a href="/contact">문의하기</a>' : `<a href="/">홈으로 돌아가기</a><a href="/guides">관련 가이드 보기</a><a href="/privacy">개인정보처리방침</a>`
  return `<main class="seo-fallback"><span class="seo-fallback-label">${escapeHtml(content.label)}</span><h1>${escapeHtml(content.heading)}</h1><p class="seo-fallback-intro">${escapeHtml(content.intro)}</p><div class="seo-fallback-sections">${sections}</div><nav class="seo-fallback-links" aria-label="관련 페이지">${links}</nav></main>`
}
const dist = resolve('dist')
const template = await readFile(resolve(dist, 'index.html'), 'utf8')
const localEnv = loadEnv(process.env.NODE_ENV || 'production', process.cwd(), '')
const rawSiteUrl = (process.env.VITE_SITE_URL || process.env.SITE_URL || localEnv.VITE_SITE_URL || 'https://file-repair-shop-kr.pages.dev').replace(/\/$/, '')
let configuredUrl = ''
if (rawSiteUrl) {
  const parsed = new URL(rawSiteUrl)
  if (parsed.protocol !== 'https:' && !['localhost', '127.0.0.1'].includes(parsed.hostname)) {
    throw new Error('VITE_SITE_URL must use HTTPS in production.')
  }
  configuredUrl = parsed.href.replace(/\/$/, '')
}

for (const [route, [title, description]] of Object.entries(routes)) {
  const canonical = configuredUrl ? `${configuredUrl}${route === '/' ? '/' : route}` : ''
  let html = template
    .replace(/<title>.*?<\/title>/, `<title>${escapeHtml(title)}</title>`)
    .replace(/<meta name="description" content="[^"]*"\s*\/?>/, `<meta name="description" content="${escapeHtml(description)}" />`)
    .replace(/<meta property="og:title" content="[^"]*"\s*\/?>/, `<meta property="og:title" content="${escapeHtml(title)}" />`)
    .replace(/<meta property="og:description" content="[^"]*"\s*\/?>/, `<meta property="og:description" content="${escapeHtml(description)}" />`)
  html = html.replace('<div id="root"></div>', `<div id="root">${renderStaticFallback(route, title, description)}</div>`)
  if (route !== '/') html = html.replace(/\s*<script id="website-structured-data"[\s\S]*?<\/script>/, '')
  if (canonical) html = html.replace('</head>', `    <link rel="canonical" href="${canonical}" />\n    <meta property="og:url" content="${canonical}" />\n  </head>`)
  if (route === '/') await writeFile(resolve(dist, 'index.html'), html)
  else {
    const directory = resolve(dist, route.slice(1))
    await mkdir(directory, { recursive: true })
    await writeFile(resolve(directory, 'index.html'), html)
  }
}

if (configuredUrl) {
  const lastModified = new Date().toISOString().slice(0, 10)
  const urls = Object.keys(routes).map((route) => `  <url><loc>${configuredUrl}${route === '/' ? '/' : route}</loc><lastmod>${lastModified}</lastmod></url>`).join('\n')
  await writeFile(resolve(dist, 'sitemap.xml'), `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`)
  await writeFile(resolve(dist, 'robots.txt'), `User-agent: *\nAllow: /\nSitemap: ${configuredUrl}/sitemap.xml\n`)
}
