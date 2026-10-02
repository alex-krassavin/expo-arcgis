import ArcGIS
import ExpoModulesCore
import Foundation

/// SharedObject wrapping a long-running ArcGIS `Job`. Reports progress via `onProgress`, runs to
/// completion via `result()` (the typed output is serialized by a closure captured at creation),
/// and supports `cancel()`. Created natively (returned from the `offline` functions), not from JS.
public final class JobRef: SharedObject {
  /// The native job, for packages built on expo-arcgis (expo-arcgis-toolkit's job manager).
  public let job: Job
  private let awaitResult: () async throws -> [String: Any]
  private var observation: NSKeyValueObservation?

  init(job: Job, awaitResult: @escaping () async throws -> [String: Any]) {
    self.job = job
    self.awaitResult = awaitResult
    super.init()
  }

  /// A handle to a job that already exists, such as one a job manager restored after the app
  /// relaunched, with the result its kind of job gives. Nil for a kind the core makes no jobs of.
  public convenience init?(restoring job: Job) {
    guard let awaitResult = restoredResult(of: job) else { return nil }
    self.init(job: job, awaitResult: awaitResult)
  }

  /// Starts the job unless it is already running (emitting `onProgress` as it advances), and awaits
  /// its serialized result.
  func result() async throws -> [String: Any] {
    observation = job.progress.observe(\.fractionCompleted) { [weak self] progress, _ in
      self?.emit(event: "onProgress", payload: ["progress": Int(progress.fractionCompleted * 100)])
    }
    // A job a job manager restored may be running already.
    if job.status == .notStarted || job.status == .paused {
      job.start()
    }
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

/// The result of a job of a kind the core makes, as its `offline`, geoprocessing and utility network
/// functions serialize it.
private func restoredResult(of job: Job) -> (() async throws -> [String: Any])? {
  switch job {
  case let job as GenerateOfflineMapJob:
    return {
      _ = try await job.result.get()
      return ["path": job.downloadDirectoryURL.path]
    }
  case let job as DownloadPreplannedOfflineMapJob:
    return {
      _ = try await job.result.get()
      return ["path": job.downloadDirectoryURL.path]
    }
  case let job as OfflineMapSyncJob:
    return {
      _ = try await job.result.get()
      return ["synced": true]
    }
  case let job as GenerateGeodatabaseJob:
    return {
      let geodatabase = try await job.result.get()
      return ["path": geodatabase.fileURL.path, "tableCount": geodatabase.featureTables.count]
    }
  case let job as SyncGeodatabaseJob:
    return {
      _ = try await job.result.get()
      return ["synced": true]
    }
  case let job as ExportTileCacheJob:
    return {
      let tileCache = try await job.result.get()
      return ["path": tileCache.fileURL?.path as Any]
    }
  case let job as ExportVectorTilesJob:
    return {
      _ = try await job.result.get()
      return ["path": job.vectorTileCacheURL?.path as Any]
    }
  case let job as GeoprocessingJob:
    return {
      let result = try await job.result.get()
      return ["outputs": try await serializeOutputs(result.outputs)]
    }
  case let job as UtilityNetworkValidationJob:
    return {
      _ = try await job.result.get()
      return ["validated": true]
    }
  default:
    return nil
  }
}
