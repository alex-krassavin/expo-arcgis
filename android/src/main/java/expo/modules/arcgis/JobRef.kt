package expo.modules.arcgis

import com.arcgismaps.tasks.Job
import expo.modules.kotlin.AppContext
import expo.modules.kotlin.sharedobjects.SharedObject
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.cancel
import kotlinx.coroutines.launch

/**
 * SharedObject wrapping a long-running ArcGIS [Job]. Reports progress via `onProgress`, runs to
 * completion via [result] (the typed output is serialized by a closure captured at creation), and
 * supports [cancel]. Created natively (returned from the `offline` functions), not from JS.
 */
class JobRef(
  appContext: AppContext,
  private val job: Job<*>,
  private val awaitResult: suspend () -> Map<String, Any?>,
) : SharedObject(appContext) {
  private val scope = CoroutineScope(Dispatchers.Main + SupervisorJob())

  /** Starts the job (emitting `onProgress` as it advances) and awaits its serialized result. */
  suspend fun result(): Map<String, Any?> {
    scope.launch {
      job.progress.collect { emit("onProgress", mapOf("progress" to it)) }
    }
    job.start()
    return awaitResult()
  }

  suspend fun cancel() {
    job.cancel()
  }

  override fun deallocate() {
    scope.cancel()
    super.deallocate()
  }
}
