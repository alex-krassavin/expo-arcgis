import ArcGIS
import ExpoModulesCore
import Foundation

/// SharedObject wrapping a long-running ArcGIS `Job`. Reports progress via `onProgress`, runs to
/// completion via `result()` (the typed output is serialized by a closure captured at creation),
/// and supports `cancel()`. Created natively (returned from the `offline` functions), not from JS.
public final class JobRef: SharedObject {
  private let job: Job
  private let awaitResult: () async throws -> [String: Any]
  private var observation: NSKeyValueObservation?

  init(job: Job, awaitResult: @escaping () async throws -> [String: Any]) {
    self.job = job
    self.awaitResult = awaitResult
    super.init()
  }

  /// Starts the job (emitting `onProgress` as it advances) and awaits its serialized result.
  func result() async throws -> [String: Any] {
    observation = job.progress.observe(\.fractionCompleted) { [weak self] progress, _ in
      self?.emit(event: "onProgress", payload: ["progress": Int(progress.fractionCompleted * 100)])
    }
    job.start()
    return try await awaitResult()
  }

  func cancel() async {
    await job.cancel()
  }

  override public func sharedObjectWillRelease() {
    observation?.invalidate()
    observation = nil
    super.sharedObjectWillRelease()
  }
}
