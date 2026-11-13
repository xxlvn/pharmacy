// Поля пользователя, которые можно отдавать клиенту.
// passwordHash сюда не входит и никогда не попадает в ответ.
export const publicUserSelect = {
  id: true,
  email: true,
  name: true,
  role: true,
  createdAt: true,
};

export function toPublicUser(user) {
  if (!user) return user;
  const { passwordHash, ...rest } = user;
  return rest;
}
