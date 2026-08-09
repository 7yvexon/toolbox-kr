const required = (name) => {
  const value = process.env[name]?.trim()
  if (!value) throw new Error(`${name} 환경변수가 필요합니다.`)
  return value
}

const applicationId = required('DISCORD_APPLICATION_ID')
const guildId = required('DISCORD_GUILD_ID')
const botToken = required('DISCORD_BOT_TOKEN')
const commands = [
  { name: 'stats', type: 1, description: '오늘 파일정비소 통계를 확인합니다.' },
  { name: 'status', type: 1, description: '파일정비소 운영 상태를 확인합니다.' },
  { name: 'errors', type: 1, description: '최근 변환 오류를 확인합니다.' },
]

const response = await fetch(`https://discord.com/api/v10/applications/${applicationId}/guilds/${guildId}/commands`, {
  method: 'PUT',
  headers: { authorization: `Bot ${botToken}`, 'content-type': 'application/json' },
  body: JSON.stringify(commands),
})
if (!response.ok) throw new Error(`Discord 명령어 등록 실패: ${response.status} ${await response.text()}`)
console.log(`Discord 명령어 ${commands.length}개를 등록했습니다.`)
