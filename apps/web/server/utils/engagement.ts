import { and, eq, sql } from 'drizzle-orm'
import type { Db } from '../db/client'
import { comments, itemLikes, libraryItems, readingProgress } from '../db/schema'

const DEFAULT_READING_THRESHOLD = 10

export async function getItemEngagementState(db: Db, itemId: number, userId?: number | null) {
  const commentsRow = (await db
    .select({ count: sql<number>`count(*)` })
    .from(comments)
    .where(eq(comments.itemId, itemId)))[0]

  const likesRow = (await db
    .select({ count: sql<number>`count(*)` })
    .from(itemLikes)
    .where(eq(itemLikes.itemId, itemId)))[0]

  const commentsCount = Number(commentsRow?.count ?? 0)
  const likesCount = Number(likesRow?.count ?? 0)

  let isLiked = false
  let isSaved = false
  let isPurchased = false
  let canLike = false
  let canComment = false

  if (userId) {
    const likeRow = (await db
      .select()
      .from(itemLikes)
      .where(and(eq(itemLikes.itemId, itemId), eq(itemLikes.userId, userId)))
      .limit(1))[0]
    isLiked = Boolean(likeRow)

    const savedRow = (await db
      .select()
      .from(libraryItems)
      .where(
        and(
          eq(libraryItems.itemId, itemId),
          eq(libraryItems.userId, userId),
          eq(libraryItems.source, 'saved')
        )
      )
      .limit(1))[0]
    isSaved = Boolean(savedRow)

    const purchasedRow = (await db
      .select()
      .from(libraryItems)
      .where(
        and(
          eq(libraryItems.itemId, itemId),
          eq(libraryItems.userId, userId),
          eq(libraryItems.source, 'purchased')
        )
      )
      .limit(1))[0]
    isPurchased = Boolean(purchasedRow)

    const progressRow = (await db
      .select()
      .from(readingProgress)
      .where(and(eq(readingProgress.userId, userId), eq(readingProgress.itemId, itemId)))
      .limit(1))[0]

    let canInteract = true
    if (progressRow) {
      const percent = Number(progressRow.percentage ?? 0)
      canInteract = Number.isFinite(percent) && percent >= DEFAULT_READING_THRESHOLD
    }

    canLike = canInteract
    canComment = canInteract
  }

  return {
    commentsCount,
    likesCount,
    isLiked,
    isSaved,
    isPurchased,
    canLike,
    canComment
  }
}
