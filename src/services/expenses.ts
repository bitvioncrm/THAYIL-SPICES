import { db } from '@/db/database'
import { nowISO, uid } from '@/lib/utils'
import type { ExpenseForm } from '@/schemas'
import type { Expense } from '@/types'
import { writeAudit } from './audit'
import { nextCode } from './ids'

export async function listExpenses(): Promise<Expense[]> {
  return db.expenses.orderBy('expenseDate').reverse().toArray()
}

export async function createExpense(data: ExpenseForm): Promise<Expense> {
  const expenseCode = await nextCode('expenses', 'expensePrefix')
  const now = nowISO()
  const expense: Expense = {
    id: uid(),
    expenseCode,
    expenseDate: data.expenseDate,
    category: data.category,
    amount: data.amount,
    paymentMethod: data.paymentMethod,
    description: data.description.trim(),
    createdAt: now,
    updatedAt: now,
  }
  await db.expenses.add(expense)
  await writeAudit('expense', expense.id, 'create', undefined, expense)
  return expense
}

export async function updateExpense(id: string, data: ExpenseForm): Promise<Expense> {
  const before = await db.expenses.get(id)
  if (!before) throw new Error('Expense not found')
  const updated: Expense = {
    ...before,
    expenseDate: data.expenseDate,
    category: data.category,
    amount: data.amount,
    paymentMethod: data.paymentMethod,
    description: data.description.trim(),
    updatedAt: nowISO(),
  }
  await db.expenses.put(updated)
  await writeAudit('expense', id, 'update', before, updated)
  return updated
}

export async function deleteExpense(id: string): Promise<void> {
  const before = await db.expenses.get(id)
  if (!before) throw new Error('Expense not found')
  await db.expenses.delete(id)
  await writeAudit('expense', id, 'delete', before, undefined)
}
