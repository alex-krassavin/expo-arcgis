import ArcGIS
import ArcGISToolkit
import ExpoArcgis
import ExpoModulesCore

/// The Toolkit's shared `JobManager`, for jobs from expo-arcgis (`JobRef`): it keeps them across
/// app launches, gives them background time, and checks their status in the background. The job
/// manager is main-actor isolated; the module calls these on the main queue.
@MainActor
enum JobManagerFunctions {
  /// The identifier of the shared job manager's background status checks. The app's Info.plist
  /// must permit it (expo-arcgis-toolkit's config plugin with `jobManager: true`): iOS stops an app
  /// that registers a background task it doesn't permit.
  static let statusCheckTask = "com.esri.ArcGISToolkit.jobManager.statusCheck"

  /// Whether the shared job manager started at launch. It must: it registers its background task
  /// when it starts, which iOS only allows while the app launches.
  static var started = false

  /// One handle per job, so that JS keeps one object for it.
  private static var refs: [ObjectIdentifier: JobRef] = [:]

  static func startAtLaunch() {
    let permitted = Bundle.main.object(forInfoDictionaryKey: "BGTaskSchedulerPermittedIdentifiers")
      as? [String] ?? []
    guard permitted.contains(statusCheckTask) else { return }
    _ = JobManager.shared
    started = true
  }

  static func manager() throws -> JobManager {
    guard started else { throw JobManagerNotStartedException() }
    return JobManager.shared
  }

  /// The managed jobs, by reference; jobs of a kind expo-arcgis doesn't make are left out.
  static func jobs() throws -> [JobRef] {
    try manager().jobs.compactMap { job in
      if let ref = refs[ObjectIdentifier(job)] { return ref }
      guard let ref = JobRef(restoring: job) else { return nil }
      refs[ObjectIdentifier(job)] = ref
      return ref
    }
  }

  // The Toolkit saves the jobs when the app moves to the background or ends. A change is saved
  // right away as well: an app that is killed gets neither notice, and would come back with the
  // jobs as they were before the change.

  static func add(_ ref: JobRef) throws {
    let manager = try manager()
    guard let job = ref.job as? any JobProtocol else { return }
    refs[ObjectIdentifier(job)] = ref
    if !manager.jobs.contains(where: { $0 === job }) {
      manager.jobs.append(job)
      manager.saveState()
    }
  }

  static func remove(_ ref: JobRef) throws {
    let manager = try manager()
    refs[ObjectIdentifier(ref.job)] = nil
    manager.jobs.removeAll { $0 === ref.job }
    manager.saveState()
  }

  /// `nil` disables the background status checks; otherwise, the interval in seconds.
  static func setBackgroundStatusCheckInterval(_ seconds: Double?) throws {
    try manager().preferredBackgroundStatusCheckSchedule =
      seconds.map { .regularInterval(interval: $0) } ?? .disabled
  }
}

final class JobManagerNotStartedException: Exception {
  override var reason: String {
    "The job manager didn't start at launch: add \(JobManagerFunctions.statusCheckTask) to "
      + "BGTaskSchedulerPermittedIdentifiers in Info.plist (the expo-arcgis-toolkit config plugin "
      + "with `jobManager: true`), then rebuild the app."
  }
}
