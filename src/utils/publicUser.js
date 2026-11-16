// Поля пользователя, которые можно отдавать клиенту (белый список).
// passwordHash, секреты 2FA, резервные коды и токен сброса пароля сюда не входят
// и никогда не попадают в ответ.
export const publicUserSelect = {
  id: true,
  email: true,
  name: true,
  role: true,
  avatarUrl: true,
  totpEnabled: true,
  createdAt: true,
};

const PUBLIC_KEYS = Object.keys(publicUserSelect);

export function toPublicUser(user) {
  if (!user) return user;
  return Object.fromEntries(PUBLIC_KEYS.filter((k) => k in user).map((k) => [k, user[k]]));
}
