package expo.modules.arcgis

import com.arcgismaps.arcgisservices.ServiceVersionInfo
import com.arcgismaps.arcgisservices.ServiceVersionParameters
import com.arcgismaps.arcgisservices.VersionAccess
import com.arcgismaps.data.ServiceGeodatabase
import expo.modules.kotlin.AppContext
import expo.modules.kotlin.sharedobjects.SharedObject

/**
 * Branch-versioning handle over a [ServiceGeodatabase]. Built by `FeatureLayerRef.getServiceGeodatabase()`
 * (never constructed from JS). Manages named branch versions and pushes the service-wide local edits
 * (across every connected table) to the active version.
 */
class ServiceGeodatabaseRef(appContext: AppContext, private val geodatabase: ServiceGeodatabase) :
  SharedObject(appContext) {

  /** Lists every branch version defined on the service. */
  suspend fun fetchVersions(): List<Map<String, Any?>> =
    geodatabase.fetchVersions().getOrThrow().map { serializeVersionInfo(it) }

  /** Creates a new branch version from `{ name, description?, access? }` and returns its info. */
  suspend fun createVersion(params: Map<String, Any?>): Map<String, Any?> {
    val parameters = ServiceVersionParameters().apply {
      (params["name"] as? String)?.let { name = it }
      (params["description"] as? String)?.let { description = it }
      access = versionAccess(params["access"] as? String)
    }
    return serializeVersionInfo(geodatabase.createVersion(parameters).getOrThrow())
  }

  /** Switches the active version (requires no outstanding local edits). */
  suspend fun switchVersion(name: String) {
    geodatabase.switchVersion(name).getOrThrow()
  }

  /** Pushes all connected tables' local edits to the active version; returns each edit's result. */
  suspend fun applyEdits(): List<Map<String, Any?>> =
    geodatabase.applyEdits().getOrThrow().flatMap { it.editResults }.map {
      mapOf("objectId" to it.objectId, "completedWithErrors" to it.completedWithErrors)
    }

  /** Discards all local edits across the connected tables. */
  suspend fun undoLocalEdits() {
    geodatabase.undoLocalEdits().getOrThrow()
  }

  fun hasLocalEdits(): Boolean = geodatabase.hasLocalEdits()
  fun getVersionName(): String = geodatabase.versionName
  fun getDefaultVersionName(): String = geodatabase.defaultVersionName
  fun supportsBranchVersioning(): Boolean = geodatabase.supportsBranchVersioning
}

/** Serializes a [ServiceVersionInfo] to a JS-friendly map. */
private fun serializeVersionInfo(info: ServiceVersionInfo): Map<String, Any?> {
  val dict = mutableMapOf<String, Any?>(
    "name" to info.name,
    "description" to info.description,
    "access" to accessString(info.access),
    "isOwner" to info.isOwner,
  )
  info.versionId?.toString()?.let { dict["versionId"] = it }
  return dict
}

/** Native [VersionAccess] -> JS string. */
private fun accessString(access: VersionAccess): String = when (access) {
  is VersionAccess.Protected -> "protected"
  is VersionAccess.Private -> "private"
  else -> "public"
}

/** JS string -> native [VersionAccess] (defaults to public). */
private fun versionAccess(string: String?): VersionAccess = when (string) {
  "protected" -> VersionAccess.Protected
  "private" -> VersionAccess.Private
  else -> VersionAccess.Public
}
