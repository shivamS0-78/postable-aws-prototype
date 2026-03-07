import { SignJWT, jwtVerify } from "jose"
import { cookies } from "next/headers"

const secretKey = process.env.JWT_SECRET || "fallback-secret-for-development-do-not-use-in-production"
const encodedKey = new TextEncoder().encode(secretKey)

export async function signToken(payload: any) {
    return new SignJWT(payload)
        .setProtectedHeader({ alg: "HS256" })
        .setIssuedAt()
        .setExpirationTime("7d")
        .sign(encodedKey)
}

export async function verifyToken(token: string | undefined = "") {
    try {
        const { payload } = await jwtVerify(token, encodedKey, {
            algorithms: ["HS256"],
        })
        return payload
    } catch (error) {
        return null
    }
}

export async function getUserSession() {
    const cookieStore = await cookies()
    const session = cookieStore.get("postable_session")?.value
    if (!session) return null
    return await verifyToken(session)
}

export async function createSession(userId: string) {
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
    const sessionToken = await signToken({ userId, expiresAt })

    const cookieStore = await cookies()
    cookieStore.set("postable_session", sessionToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        expires: expiresAt,
        sameSite: "lax",
        path: "/",
    })
}

export async function deleteSession() {
    const cookieStore = await cookies()
    cookieStore.delete("postable_session")
}
