package com.americabitcoinatm.wallet

import android.content.Context
import android.content.pm.PackageManager
import android.os.Build
import android.util.Log
import com.bugsnag.android.Bugsnag
import java.io.File
import java.security.MessageDigest

/**
 * Labels crash reports from tampered or instrumented installs so they can be filtered
 * out of crash triage (Bugsnag tab "integrity_check"). It only observes and reports:
 * nothing here blocks the app, and none of it is a security control on its own.
 *
 * Signals:
 * - signing_cert_sha256: the certificate the installed APK is signed with. A repackaged
 *   APK has to be re-signed, so a value other than our Play app signing certificate means
 *   the binary was modified.
 * - installer: who installed the app (com.android.vending for Play).
 * - frida: a Frida gadget/agent is mapped into the process or one of its threads is running.
 */
object IntegrityCheck {
    private const val TAG = "IntegrityCheck"
    private const val SECTION = "integrity_check"

    private val FRIDA_MARKERS = listOf("frida", "gum-js-loop", "linjector")

    fun reportToBugsnag(context: Context) {
        Thread {
            try {
                val cert = signingCertSha256(context)
                val installer = installerPackage(context)
                val frida = fridaDetected()
                Bugsnag.addMetadata(SECTION, "signing_cert_sha256", cert ?: "unknown")
                Bugsnag.addMetadata(SECTION, "installer", installer ?: "unknown")
                Bugsnag.addMetadata(SECTION, "frida", frida)
                Bugsnag.addMetadata(SECTION, "tampered", frida)
                if (frida) {
                    Bugsnag.leaveBreadcrumb("Integrity check: instrumentation detected (Frida)")
                }
            } catch (e: Exception) {
                Log.w(TAG, "Integrity check failed", e)
            }
        }.apply { name = "abtm-integrity" }.start()
    }

    private fun signingCertSha256(context: Context): String? {
        val pm = context.packageManager
        val signatures = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.P) {
            val info = pm.getPackageInfo(context.packageName, PackageManager.GET_SIGNING_CERTIFICATES)
            info.signingInfo?.apkContentsSigners
        } else {
            @Suppress("DEPRECATION")
            pm.getPackageInfo(context.packageName, PackageManager.GET_SIGNATURES).signatures
        }
        val cert = signatures?.firstOrNull() ?: return null
        return MessageDigest.getInstance("SHA-256").digest(cert.toByteArray())
            .joinToString(":") { "%02X".format(it) }
    }

    private fun installerPackage(context: Context): String? =
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
            context.packageManager.getInstallSourceInfo(context.packageName).installingPackageName
        } else {
            @Suppress("DEPRECATION")
            context.packageManager.getInstallerPackageName(context.packageName)
        }

    private fun fridaDetected(): Boolean {
        val maps = try {
            File("/proc/self/maps").readText()
        } catch (e: Exception) {
            ""
        }
        if (maps.contains("frida", ignoreCase = true)) return true

        val threads = File("/proc/self/task").listFiles() ?: return false
        return threads.any { task ->
            val name = try {
                File(task, "comm").readText().trim()
            } catch (e: Exception) {
                ""
            }
            FRIDA_MARKERS.any { name.contains(it, ignoreCase = true) }
        }
    }
}
